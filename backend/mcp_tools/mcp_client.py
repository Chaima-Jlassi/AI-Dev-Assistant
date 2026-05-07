"""
mcp_tools/mcp_client.py — MCP Client
=====================================
Used by app.py and api_server.py to call every tool through the MCP protocol.
No direct LLM / PlantUML / RAG imports anywhere outside mcp_tools/server.py.

FastMCP exposes TWO endpoints when run with transport="sse":
    GET  /sse   — SSE stream the client subscribes to for server→client messages
    POST /messages/?session_id=<id>  — client→server JSON-RPC messages

This client implements that SSE handshake correctly.

Recommended workflow:
    Terminal 1:  python -m mcp_tools.server --mode http --port 8001
    Terminal 2:  python app.py              (or python api_server.py)

For all-in-one use (no separate server process), pass transport="stdio".
"""

from __future__ import annotations

import json
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from logger import logger


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_json(mcp_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    MCP tools return { content: [{type:"text", text:"<json>"}] }.
    Extract and parse the JSON payload into a plain dict.
    If the text isn't JSON (e.g. a plain string), wrap it.
    """
    for block in mcp_result.get("content", []):
        if block.get("type") == "text":
            text = block["text"]
            try:
                return json.loads(text)
            except (json.JSONDecodeError, ValueError):
                return {"success": True, "content": text}
    # Already a plain dict (HTTP transport parses eagerly)
    return mcp_result


# =============================================================================
# Stdio Transport
# =============================================================================

class _StdioTransport:
    """
    Spawns mcp_tools/server.py as a subprocess and speaks JSON-RPC 2.0
    over its stdin/stdout with Content-Length framing (MCP stdio spec).
    """

    def __init__(self) -> None:
        self._proc: Optional[subprocess.Popen] = None
        self._lock = threading.Lock()
        self._start()

    def _start(self) -> None:
        logger.info("MCPClient[stdio]: spawning server subprocess …")
        # server.py lives next to this file inside mcp_tools/
        server_path = Path(__file__).resolve().parent / "server.py"
        root_path   = server_path.parent.parent          # backend/

        self._proc = subprocess.Popen(
            [sys.executable, str(server_path), "--mode", "stdio"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False,      # binary — we handle encoding ourselves
            bufsize=0,
            cwd=str(root_path),   # run from backend/ so config imports work
        )
        time.sleep(0.5)
        if self._proc.poll() is not None:
            err = self._proc.stderr.read().decode(errors="replace")
            raise RuntimeError(f"MCP server subprocess failed to start:\n{err}")
        logger.info("MCPClient[stdio]: server ready")

    # ── Handshake ─────────────────────────────────────────────────────────────

    def initialize(self) -> None:
        self.call("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "pcd-foc-client", "version": "2.0.0"},
        })
        # Required notification after initialize
        notif = {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}
        self._write(_frame(json.dumps(notif)))

    # ── I/O ───────────────────────────────────────────────────────────────────

    def _write(self, data: bytes) -> None:
        assert self._proc and self._proc.stdin
        self._proc.stdin.write(data)
        self._proc.stdin.flush()

    def _read_one(self) -> str:
        """Read one Content-Length-framed message from stdout."""
        assert self._proc and self._proc.stdout
        out = self._proc.stdout

        # Read headers until double CRLF
        header_bytes = b""
        while not header_bytes.endswith(b"\r\n\r\n"):
            ch = out.read(1)
            if not ch:
                raise EOFError("MCP server closed stdout unexpectedly")
            header_bytes += ch

        content_length = 0
        for line in header_bytes.split(b"\r\n"):
            if line.lower().startswith(b"content-length:"):
                content_length = int(line.split(b":", 1)[1].strip())
                break

        if content_length == 0:
            raise ValueError("MCP response has no Content-Length header")

        return out.read(content_length).decode("utf-8")

    # ── Public ────────────────────────────────────────────────────────────────

    def call(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        req_id = str(uuid.uuid4())
        msg    = {"jsonrpc": "2.0", "id": req_id, "method": method, "params": params}
        with self._lock:
            self._write(_frame(json.dumps(msg)))
            raw = self._read_one()
        data = json.loads(raw)
        if "error" in data:
            raise RuntimeError(
                f"MCP error [{data['error'].get('code')}]: {data['error'].get('message')}"
            )
        return data.get("result", {})

    def close(self) -> None:
        if self._proc:
            try:
                self._proc.terminate()
            except Exception:
                pass
            self._proc = None


def _frame(payload: str) -> bytes:
    """Wrap a JSON string in Content-Length framing."""
    body = payload.encode("utf-8")
    header = f"Content-Length: {len(body)}\r\n\r\n".encode("ascii")
    return header + body


# =============================================================================
# SSE Transport  (matches FastMCP transport="sse")
# =============================================================================
#
# FastMCP SSE protocol:
#   1. Client opens GET /sse  → kept open as a persistent event stream
#   2. Server immediately sends:  event: endpoint
#                                 data: /messages/?session_id=<sid>
#   3. Client POSTs each JSON-RPC request to that session URL
#      → server ACKs with HTTP 202 (empty body)
#   4. Server sends the JSON-RPC response as an SSE event on the open stream
#      → data: {"jsonrpc":"2.0","id":"...","result":{...}}
#
# The SSE stream MUST stay open for the lifetime of the session.
# A background thread reads it continuously and delivers responses
# to waiting callers via per-request threading.Event objects.
# =============================================================================

class _SseTransport:
    """
    Correct SSE client for FastMCP transport="sse".
    Keeps the SSE stream open in a daemon thread; POSTs requests to
    /messages/ and waits for the matching response on the stream.
    """

    _CALL_TIMEOUT = 180   # seconds to wait for a tool response

    def __init__(self, base_url: str) -> None:
        try:
            import requests as _req
            self._req = _req
        except ImportError:
            raise ImportError("pip install requests")

        self._base         = base_url.rstrip("/")
        self._sse_url      = self._base + "/sse"
        self._messages_url: Optional[str] = None
        self._post_session = self._req.Session()
        self._call_lock    = threading.Lock()   # serialise concurrent callers

        # id → (Event, result-holder)
        self._pending: Dict[str, tuple] = {}
        self._pending_lock = threading.Lock()

        self._sse_thread: Optional[threading.Thread] = None
        self._stop        = threading.Event()
        self._ready       = threading.Event()   # set once endpoint received
        self._start_error: Optional[Exception] = None

        logger.info(f"MCPClient[sse]: connecting to {self._sse_url}")
        self._sse_thread = threading.Thread(
            target=self._sse_reader, daemon=True, name="mcp-sse-reader"
        )
        self._sse_thread.start()

        # Wait until the endpoint event arrives (or fail fast)
        if not self._ready.wait(timeout=10):
            self._stop.set()
            if self._start_error:
                raise self._start_error
            raise RuntimeError(
                f"SSE endpoint did not send 'endpoint' event within 10 s.\n"
                f"Is the server running?  ({self._sse_url})"
            )
        logger.info(f"MCPClient[sse]: session URL → {self._messages_url}")

    # ── Background SSE reader ─────────────────────────────────────────────────

    def _sse_reader(self) -> None:
        """Daemon thread: keep GET /sse open and dispatch incoming events."""
        try:
            with self._req.get(
                self._sse_url,
                stream=True,
                timeout=(5, None),   # connect timeout=5 s, read timeout=infinite
                headers={"Accept": "text/event-stream", "Cache-Control": "no-cache"},
            ) as resp:
                if resp.status_code != 200:
                    self._start_error = RuntimeError(
                        f"GET /sse returned HTTP {resp.status_code}"
                    )
                    self._ready.set()
                    return

                event_type = None
                data_lines: list = []

                for raw in resp.iter_lines(decode_unicode=True):
                    if self._stop.is_set():
                        break

                    # SSE format: blank line = end of event
                    if raw == "":
                        self._dispatch(event_type, "\n".join(data_lines))
                        event_type = None
                        data_lines = []
                        continue

                    if raw.startswith("event:"):
                        event_type = raw[len("event:"):].strip()
                    elif raw.startswith("data:"):
                        data_lines.append(raw[len("data:"):].strip())

        except Exception as exc:
            if not self._ready.is_set():
                self._start_error = RuntimeError(
                    f"Cannot connect to MCP server at {self._sse_url}: {exc}\n"
                    "Start it with:  python -m mcp_tools.server --mode http --port 8001"
                )
                self._ready.set()

    def _dispatch(self, event_type: Optional[str], data: str) -> None:
        """Handle one complete SSE event."""
        if not data:
            return

        # First event: server tells us the messages URL
        if event_type == "endpoint" or (
            not self._ready.is_set() and data.startswith("/messages")
        ):
            # Server may return a session id without hyphens (32 hex chars).
            # Normalize to canonical hyphenated UUID form so server lookup succeeds.
            path = data.strip()
            try:
                import re
                m = re.search(r'session_id=([0-9a-fA-F]{32}|[0-9a-fA-F\-]{36})', path)
                if m:
                    sid = m.group(1)
                    if len(sid) == 32:
                        # insert hyphens at 8-12-16-20
                        sid = f"{sid[0:8]}-{sid[8:12]}-{sid[12:16]}-{sid[16:20]}-{sid[20:32]}"
                        path = re.sub(r'session_id=[0-9a-fA-F]{32}', f'session_id={sid}', path)
            except Exception:
                pass
            self._messages_url = self._base + path
            self._ready.set()
            return

        # All other events: JSON-RPC response or notification
        try:
            msg = json.loads(data)
        except json.JSONDecodeError:
            return   # ignore non-JSON events (ping, etc.)

        req_id = str(msg.get("id", ""))
        with self._pending_lock:
            entry = self._pending.get(req_id)

        if entry:
            evt, holder = entry
            holder["data"] = msg
            evt.set()   # wake the waiting call() thread

    # ── Sending ───────────────────────────────────────────────────────────────

    def _post_raw(self, body: Dict[str, Any]) -> None:
        """POST one JSON-RPC message to the session URL (fire-and-forget)."""
        try:
            self._post_session.post(
                self._messages_url,
                json=body,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )
            # Response is 202 Accepted with empty body — that's correct.
        except Exception as exc:
            raise RuntimeError(f"POST to MCP server failed: {exc}") from exc

    # ── Public ────────────────────────────────────────────────────────────────

    def initialize(self) -> None:
        """MCP handshake (called once after construction)."""
        self.call("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "pcd-foc-client", "version": "2.0.0"},
        })
        # Notification — no response expected
        self._post_raw({
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {},
        })

    def call(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        req_id = str(uuid.uuid4())
        evt    = threading.Event()
        holder: Dict[str, Any] = {}

        with self._pending_lock:
            self._pending[req_id] = (evt, holder)

        try:
            with self._call_lock:   # serialise so SSE stream stays readable
                self._post_raw({
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "method": method,
                    "params": params,
                })
                if not evt.wait(timeout=self._CALL_TIMEOUT):
                    raise RuntimeError(
                        f"Timeout waiting for MCP response to '{method}' "
                        f"({self._CALL_TIMEOUT} s)"
                    )
        finally:
            with self._pending_lock:
                self._pending.pop(req_id, None)

        data = holder["data"]
        if "error" in data:
            raise RuntimeError(
                f"MCP error [{data['error'].get('code')}]: "
                f"{data['error'].get('message')}"
            )
        return data.get("result", {})

    def close(self) -> None:
        self._stop.set()
        self._post_session.close()


# =============================================================================
# Public facade: MCPClient
# =============================================================================

class MCPClient:
    """
    High-level MCP client.  All calls go through the real MCP protocol.

    Parameters
    ----------
    transport : "sse" (default) | "stdio"
        "sse"   — connects to a running FastMCP server via SSE + POST /messages
                  Start server:  python -m mcp_tools.server --mode http --port 8001
        "stdio" — spawns server.py as a subprocess (no separate terminal needed)
    base_url  : used only when transport="sse"  (default: http://localhost:8001)

    Examples
    --------
        client = MCPClient()                          # SSE (server runs separately)
        client = MCPClient(transport="stdio")         # self-contained
    """

    def __init__(
        self,
        transport: str = "sse",
        base_url: str  = "http://localhost:8001",
    ) -> None:
        if transport in ("sse", "http"):   # accept "http" as alias for "sse"
            self._t = _SseTransport(base_url)
        else:
            self._t = _StdioTransport()
        self._t.initialize()
        self._transport_name = transport

    # ── MCP protocol ─────────────────────────────────────────────────────────

    def list_tools(self) -> Dict[str, Any]:
        """Return the server's tool manifest  { tools: [{name, description, inputSchema}] }."""
        return self._t.call("tools/list", {})

    def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Invoke a named MCP tool.
        Returns the raw MCP result  { content: [{type, text}], isError?: bool }.
        """
        logger.info(f"MCPClient.call_tool → {name}  ({list(arguments.keys())})")
        result = self._t.call("tools/call", {"name": name, "arguments": arguments})
        if result.get("isError"):
            raise RuntimeError(f"MCP tool '{name}' returned isError=true: {result}")
        return result

    def read_resource(self, uri: str) -> Any:
        """Read a named MCP resource (e.g. 'config://ollama')."""
        result   = self._t.call("resources/read", {"uri": uri})
        contents = result.get("contents", [])
        if contents:
            try:
                return json.loads(contents[0].get("text", "{}"))
            except Exception:
                return contents[0].get("text")
        return {}

    # ── Convenience wrappers (one per server-side tool) ───────────────────────

    def generate_uml_diagram(
        self,
        description: str,
        diagram_type: str = "auto",
        count: int = 1,
    ) -> Dict[str, Any]:
        return _extract_json(self.call_tool("generate_uml_diagram", {
            "description": description,
            "diagram_type": diagram_type,
            "count": count,
        }))

    def generate_readme(
        self,
        project_description: str,
        language: str = "python",
    ) -> Dict[str, Any]:
        return _extract_json(self.call_tool("generate_readme", {
            "project_description": project_description,
            "language": language,
        }))

    def generate_unit_tests(
        self,
        code: str,
        language: str = "python",
        framework: Optional[str] = None,
    ) -> Dict[str, Any]:
        args: Dict[str, Any] = {"code": code, "language": language}
        if framework:
            args["framework"] = framework
        return _extract_json(self.call_tool("generate_unit_tests", args))

    def explain_code(
        self,
        code: str,
        detail_level: str = "medium",
    ) -> Dict[str, Any]:
        return _extract_json(self.call_tool("explain_code", {
            "code": code,
            "detail_level": detail_level,
        }))

    def detect_language(self, code: str) -> Dict[str, Any]:
        return _extract_json(self.call_tool("detect_language", {"code": code}))

    def select_test_framework(
        self,
        language: str,
        preferred: Optional[str] = None,
    ) -> Dict[str, Any]:
        args: Dict[str, Any] = {"language": language}
        if preferred:
            args["preferred"] = preferred
        return _extract_json(self.call_tool("select_test_framework", args))

    def search_similar_examples(
        self,
        query: str,
        top_k: int = 3,
    ) -> Dict[str, Any]:
        return _extract_json(self.call_tool("search_similar_examples", {
            "query": query,
            "top_k": top_k,
        }))

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def close(self) -> None:
        self._t.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


# =============================================================================
# Singleton factory
# =============================================================================

_client: Optional[MCPClient] = None


def get_mcp_client(
    transport: str = "sse",
    base_url:  str = "http://localhost:8001",
) -> MCPClient:
    """
    Return (and lazily create) the process-wide MCPClient.

    Default transport is SSE — the MCP server must be started separately:
        python -m mcp_tools.server --mode http --port 8001

    For a self-contained single-process setup pass transport="stdio".
    """
    global _client
    if _client is None:
        logger.info(f"Creating MCPClient  transport={transport}  url={base_url}")
        _client = MCPClient(transport=transport, base_url=base_url)
    return _client