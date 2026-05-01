"""
api_server.py — Flask REST API  (port 8000)
============================================
Every AI operation is delegated to the MCP server via MCPClient.
Zero direct LLM / PlantUML / RAG imports here.

Start order:
    Terminal 1:  python -m mcp_tools.server --mode http --port 8001
    Terminal 2:  python api_server.py
"""

import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from config import CONFIG
from logger import logger
from mcp_tools.mcp_client import get_mcp_client
from gemini_prompts import GeminiPromptEngine

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

MCP_TRANSPORT = os.getenv("MCP_TRANSPORT", "sse").strip().lower()
MCP_URL = os.getenv("MCP_URL", "http://localhost:8001").strip()
_GEMINI_ENGINE: GeminiPromptEngine | None = None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DIAGRAM_KEYWORDS = (
    "diagram", "uml", "draw", "sketch", "visualize", "architecture",
    "system design", "workflow", "flow", "chart", "erd", "entity relationship",
    "sequence", "class diagram", "use case", "flowchart", "activity diagram",
    "state diagram", "component diagram", "plantuml",
)


def _is_diagram_request(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in _DIAGRAM_KEYWORDS)


def _compact_context(context: str, max_chars: int = 45000) -> str:
    if not context:
        return ""
    clean = context.strip()
    if len(clean) <= max_chars:
        return clean
    head = clean[: int(max_chars * 0.7)]
    tail = clean[-int(max_chars * 0.3):]
    return head + "\n\n... [trimmed for token budget] ...\n\n" + tail


def _diagrams_to_markdown(diagrams: list) -> str:
    lines = ["Generated diagram(s) via MCP + PlantUML:"]
    for d in diagrams:
        idx      = d["index"]
        filename = Path(d["image_path"]).name
        url      = f"{request.host_url.rstrip('/')}/api/diagrams/{filename}"
        lines += [f"\n### Diagram {idx}", f"![Diagram {idx}]({url})", f"[Open]({url})"]
    return "\n".join(lines)


def _read_file_if_path(value: str) -> str:
    p = Path(value)
    if p.exists() and p.is_file():
        try:
            return p.read_text(encoding="utf-8")
        except Exception:
            return value
    return value


def _get_mcp():
    if MCP_TRANSPORT in ("sse", "http"):
        return get_mcp_client(transport="sse", base_url=MCP_URL)
    return get_mcp_client(transport="stdio")


def _get_gemini():
    global _GEMINI_ENGINE
    if _GEMINI_ENGINE is None:
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is required for Gemini-powered outputs")
        _GEMINI_ENGINE = GeminiPromptEngine(api_key)
    return _GEMINI_ENGINE


def _extract_text_result(result: dict, fields: tuple[str, ...], default_error: str) -> tuple[str, str | None]:
    if not isinstance(result, dict):
        return "", default_error
    if result.get("success") is False:
        return "", str(result.get("error", default_error))
    for field in fields:
        value = result.get(field)
        if isinstance(value, str) and value.strip():
            return value, None
    return "", default_error


# ---------------------------------------------------------------------------
# Static — serve rendered diagram images
# ---------------------------------------------------------------------------

@app.get("/api/diagrams/<path:filename>")
def serve_diagram(filename: str):
    diagrams_dir = Path(CONFIG.outputs.diagrams_dir).resolve()
    return send_from_directory(diagrams_dir, filename)


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

@app.post("/api/chat")
def chat():
    payload  = request.get_json(silent=True) or {}
    messages = payload.get("messages")
    if not isinstance(messages, list):
        return jsonify({"error": "messages must be an array"}), 400

    try:
        user_msgs = [
            m.get("content", "").strip()
            for m in messages
            if m.get("role") == "user"
        ]
        if not user_msgs or not user_msgs[-1]:
            return jsonify({"error": "last user message is required"}), 400

        latest        = user_msgs[-1]
        diagram_count = max(1, min(int(payload.get("diagramCount", 1)), 3))
        force_diagram = bool(payload.get("forceDiagram", False))

        mcp = _get_mcp()

        if force_diagram or _is_diagram_request(latest):
            try:
                result = mcp.generate_uml_diagram(
                    description=latest,
                    diagram_type="auto",
                    count=diagram_count,
                )
                if result.get("success"):
                    reply = _diagrams_to_markdown(result["diagrams"])
                else:
                    raise RuntimeError(result.get("error", "unknown error"))
            except Exception as exc:
                logger.error(f"Diagram generation failed, falling back: {exc}")
                # Primary fallback: ask the explain_code tool for a low-detail textual
                # explanation. Use named args for clarity.
                fallback = mcp.explain_code(code=latest, detail_level="low")
                fallback_text, fallback_error = _extract_text_result(
                    fallback,
                    ("explanation", "content"),
                    "fallback text generation failed",
                )

                if not fallback_text:
                    # Secondary fallback: try Gemini if configured. This is optional
                    # and may raise if GEMINI_API_KEY is not set; handle gracefully.
                    try:
                        gem = _get_gemini()
                        gem_text = gem.generate_recommendation(
                            code=latest,
                            project_name="",
                            language="auto",
                            description=(
                                "Provide a concise textual description or summary that could "
                                "serve as a fallback for a UML/architecture diagram request."
                            ),
                        )
                        if str(gem_text).strip():
                            reply = (
                                "I couldn't render the diagram right now. Here's a text response:\n\n"
                                + str(gem_text)
                            )
                        else:
                            reply = (
                                "I couldn't render the diagram right now. Here's a text response:\n\n"
                                + (fallback_error or str(exc))
                            )
                    except Exception as gem_exc:
                        logger.error(f"Gemini fallback failed: {gem_exc}")
                        reply = (
                            "I couldn't render the diagram right now. Here's a text response:\n\n"
                            + (fallback_error or str(exc))
                        )
                else:
                    reply = (
                        "I couldn't render the diagram right now. Here's a text response:\n\n"
                        + fallback_text
                    )
        else:
            result = mcp.explain_code(latest, detail_level="medium")
            reply, explain_error = _extract_text_result(
                result,
                ("explanation", "content"),
                "explain_code returned empty output",
            )
            if explain_error:
                raise RuntimeError(explain_error)

        return jsonify({"reply": reply})

    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except Exception as err:
        logger.error(f"chat endpoint error: {err}")
        return jsonify({"error": f"chat generation failed: {err}"}), 500


@app.post("/api/analyze")
def analyze():
    payload = request.get_json(silent=True) or {}
    tool_type = str(payload.get("type", "")).strip().lower()
    prompt = str(payload.get("prompt", "")).strip()
    context = _compact_context(str(payload.get("context", "")).strip())

    if not tool_type:
        return jsonify({"error": "type is required"}), 400

    mcp = _get_mcp()
    combined = f"{prompt}\n\nContext:\n{context}".strip()

    try:
        if tool_type == "uml":
            result = mcp.generate_uml_diagram(
                description=combined,
                diagram_type="auto",
                count=1
            )
            if not result.get("success"):
                return jsonify({"error": result.get("error", "diagram generation failed")}), 500
            return jsonify({"result": _diagrams_to_markdown(result.get("diagrams", []))})

        if tool_type == "readme":
            readme_text = _get_gemini().generate_readme(
                code=combined,
                project_name="",
                language="auto",
                description=prompt,
            )
            if not str(readme_text).strip():
                return jsonify({"error": "readme generation returned empty output"}), 500
            return jsonify({"result": readme_text})

        if tool_type == "tests":
            result = mcp.generate_unit_tests(code=combined, language="python")
            if not result.get("success"):
                return jsonify({"error": result.get("error", "test generation failed")}), 500
            return jsonify({"result": result.get("content", "")})

        if tool_type == "architecture":
            architecture_text = _get_gemini().generate_architecture(
                code=combined,
                project_name="",
                language="auto",
                description=prompt,
            )
            if not str(architecture_text).strip():
                return jsonify({"error": "architecture generation returned empty output"}), 500
            return jsonify({"result": architecture_text})

        if tool_type == "recommendation":
            recommendation_text = _get_gemini().generate_recommendation(
                code=combined,
                project_name="",
                language="auto",
                description=prompt,
            )
            if not str(recommendation_text).strip():
                return jsonify({"error": "recommendation generation returned empty output"}), 500
            return jsonify({"result": recommendation_text})

        if tool_type in ("explain", "review"):
            level = "high" if tool_type == "review" else "medium"
            result = mcp.explain_code(code=combined, detail_level=level)
            output, explain_error = _extract_text_result(
                result,
                ("explanation", "content"),
                "explain returned empty output",
            )
            if explain_error:
                return jsonify({"error": explain_error}), 500
            return jsonify({"result": output})

        return jsonify({"error": f"Unsupported tool type: {tool_type}"}), 400
    except Exception as exc:
        logger.error(f"/api/analyze failed: {exc}")
        return jsonify({"error": str(exc)}), 500


# ---------------------------------------------------------------------------
# MCP tool pass-through endpoints
# ---------------------------------------------------------------------------

@app.get("/api/mcp/tools")
def mcp_list_tools():
    """Return the MCP server's tool manifest."""
    try:
        return jsonify(_get_mcp().list_tools())
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.post("/api/mcp/generate_uml")
def mcp_generate_uml():
    """
    Generate a UML diagram.
    Body: { "description": "...", "diagram_type": "auto", "count": 1 }
    """
    payload     = request.get_json(silent=True) or {}
    description = payload.get("description") or payload.get("uml_code")
    if not description:
        return jsonify({"error": "description is required"}), 400

    result = _get_mcp().generate_uml_diagram(
        description=description,
        diagram_type=payload.get("diagram_type", "auto"),
        count=int(payload.get("count", 1)),
    )
    return jsonify(result), 200 if result.get("success") else 500


@app.post("/api/mcp/detect_language")
def mcp_detect_language():
    """Body: { "code": "..." }"""
    payload = request.get_json(silent=True) or {}
    code    = payload.get("code")
    if not code:
        return jsonify({"error": "code is required"}), 400
    return jsonify(_get_mcp().detect_language(code))


@app.post("/api/mcp/select_framework")
def mcp_select_framework():
    """Body: { "language": "python", "preferred": "pytest" }"""
    payload  = request.get_json(silent=True) or {}
    language = payload.get("language")
    if not language:
        return jsonify({"error": "language is required"}), 400
    return jsonify(_get_mcp().select_test_framework(language, payload.get("preferred")))


@app.post("/api/mcp/generate_tests")
def mcp_generate_tests():
    """Body: { "code": "...", "language": "python", "framework": "pytest" }"""
    payload = request.get_json(silent=True) or {}
    code    = payload.get("code")
    if not code:
        return jsonify({"error": "code is required"}), 400
    result = _get_mcp().generate_unit_tests(
        code=code,
        language=payload.get("language", "python"),
        framework=payload.get("framework"),
    )
    return jsonify(result), 200 if result.get("success") else 500


@app.post("/api/mcp/generate_readme")
def mcp_generate_readme():
    """Body: { "project_description": "...", "language": "python" }"""
    payload = request.get_json(silent=True) or {}
    desc    = payload.get("project_description")
    if not desc:
        return jsonify({"error": "project_description is required"}), 400
    result = _get_mcp().generate_readme(desc, payload.get("language", "python"))
    return jsonify(result), 200 if result.get("success") else 500


@app.post("/api/mcp/explain_code")
def mcp_explain_code():
    """Body: { "code": "...", "detail_level": "medium" }"""
    payload = request.get_json(silent=True) or {}
    code    = payload.get("code")
    if not code:
        return jsonify({"error": "code is required"}), 400
    return jsonify(_get_mcp().explain_code(code, payload.get("detail_level", "medium")))


@app.post("/api/mcp/search_examples")
def mcp_search_examples():
    """Body: { "query": "...", "top_k": 3 }"""
    payload = request.get_json(silent=True) or {}
    query   = payload.get("query")
    if not query:
        return jsonify({"error": "query is required"}), 400
    return jsonify(_get_mcp().search_similar_examples(query, int(payload.get("top_k", 3))))


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return jsonify({"status": "ok", "mcp_transport": MCP_TRANSPORT, "mcp_url": MCP_URL})


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port",    type=int, default=8000)
    args = parser.parse_args()

    # Try to initialize MCP transport, but don't block API boot.
    try:
        _get_mcp()
        logger.info(f"MCP initialized (transport={MCP_TRANSPORT}, url={MCP_URL})")
    except Exception as exc:
        logger.warning(f"MCP warmup failed (transport={MCP_TRANSPORT}, url={MCP_URL}): {exc}")

    logger.info(f"Flask API starting on port {args.port}, MCP transport={MCP_TRANSPORT}")
    app.run(host="0.0.0.0", port=args.port, debug=False)
