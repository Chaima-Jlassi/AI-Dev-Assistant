"""
api_server.py — Flask REST API  (port 8000)
============================================
Every AI operation is delegated to the MCP server via MCPClient.
Zero direct LLM / PlantUML / RAG imports here.

Start order:
    Terminal 1:  python -m mcp_tools.server --mode http --port 8001
    Terminal 2:  python api_server.py
"""

from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from config import CONFIG
from logger import logger
from mcp_tools.mcp_client import get_mcp_client

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

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


def _diagrams_to_markdown(diagrams: list) -> str:
    lines = ["Generated diagram(s) via MCP + PlantUML:"]
    for d in diagrams:
        idx      = d["index"]
        filename = Path(d["image_path"]).name
        url      = f"{request.host_url.rstrip('/')}/api/diagrams/{filename}"
        lines += [f"\n### Diagram {idx}", f"![Diagram {idx}]({url})", f"[Open]({url})"]
    return "\n".join(lines)


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

        mcp = get_mcp_client()

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
                fallback = mcp.explain_code(latest, detail_level="low")
                reply = (
                    "I couldn't render the diagram right now. Here's a text response:\n\n"
                    + fallback.get("explanation", str(exc))
                )
        else:
            result = mcp.explain_code(latest, detail_level="medium")
            reply  = result.get("explanation", result.get("content", ""))

        return jsonify({"reply": reply})

    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except Exception as err:
        logger.error(f"chat endpoint error: {err}")
        return jsonify({"error": f"chat generation failed: {err}"}), 500


# ---------------------------------------------------------------------------
# MCP tool pass-through endpoints
# ---------------------------------------------------------------------------

@app.get("/api/mcp/tools")
def mcp_list_tools():
    """Return the MCP server's tool manifest."""
    try:
        return jsonify(get_mcp_client().list_tools())
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

    result = get_mcp_client().generate_uml_diagram(
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
    return jsonify(get_mcp_client().detect_language(code))


@app.post("/api/mcp/select_framework")
def mcp_select_framework():
    """Body: { "language": "python", "preferred": "pytest" }"""
    payload  = request.get_json(silent=True) or {}
    language = payload.get("language")
    if not language:
        return jsonify({"error": "language is required"}), 400
    return jsonify(get_mcp_client().select_test_framework(language, payload.get("preferred")))


@app.post("/api/mcp/generate_tests")
def mcp_generate_tests():
    """Body: { "code": "...", "language": "python", "framework": "pytest" }"""
    payload = request.get_json(silent=True) or {}
    code    = payload.get("code")
    if not code:
        return jsonify({"error": "code is required"}), 400
    result = get_mcp_client().generate_unit_tests(
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
    result = get_mcp_client().generate_readme(desc, payload.get("language", "python"))
    return jsonify(result), 200 if result.get("success") else 500


@app.post("/api/mcp/explain_code")
def mcp_explain_code():
    """Body: { "code": "...", "detail_level": "medium" }"""
    payload = request.get_json(silent=True) or {}
    code    = payload.get("code")
    if not code:
        return jsonify({"error": "code is required"}), 400
    return jsonify(get_mcp_client().explain_code(code, payload.get("detail_level", "medium")))


@app.post("/api/mcp/search_examples")
def mcp_search_examples():
    """Body: { "query": "...", "top_k": 3 }"""
    payload = request.get_json(silent=True) or {}
    query   = payload.get("query")
    if not query:
        return jsonify({"error": "query is required"}), 400
    return jsonify(get_mcp_client().search_similar_examples(query, int(payload.get("top_k", 3))))


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return jsonify({"status": "ok", "mcp_url": "http://localhost:8003/sse"})


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--mcp-url", default="http://localhost:8001")
    parser.add_argument("--port",    type=int, default=8000)
    args = parser.parse_args()

    # Prime the singleton with the right URL before serving requests
    get_mcp_client(transport="http", base_url=args.mcp_url)

    logger.info(f"Flask API starting on port {args.port}, MCP at {args.mcp_url}")
    app.run(host="0.0.0.0", port=args.port, debug=False)