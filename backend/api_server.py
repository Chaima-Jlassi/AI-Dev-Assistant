import time
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from config import CONFIG
from llm.ollama_client import get_client
from llm.uml_generator import generate_plantuml
from logger import logger
from mcp.tools_v2 import PlantUMLRenderer
from rag.retriever_v2 import retrieve_context

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


def _build_prompt(messages: list[dict]) -> str:
    if not messages:
        raise ValueError("messages cannot be empty")

    user_messages = [m.get("content", "").strip() for m in messages if m.get("role") == "user"]
    if not user_messages or not user_messages[-1]:
        raise ValueError("last user message is required")

    latest_user_prompt = user_messages[-1]
    history_messages = messages[:-1]
    history_lines = []
    for item in history_messages:
        role = item.get("role", "user")
        content = item.get("content", "").strip()
        if not content:
            continue
        history_lines.append(f"{role}: {content}")

    if not history_lines:
        return latest_user_prompt

    history_block = "\n".join(history_lines)
    return (
        f"User prompt:\n{latest_user_prompt}\n\n"
        f"Previous conversation context:\n{history_block}\n\n"
        "Respond to the user prompt while considering the context above."
    )


def _looks_like_diagram_request(text: str) -> bool:
    value = text.lower()
    keywords = (
        "diagram",
        "uml",
        "draw",
        "sketch",
        "visualize",
        "architecture",
        "system design",
        "workflow",
        "flow",
        "chart",
        "erd",
        "entity relationship",
        "sequence",
        "class diagram",
        "use case",
        "flowchart",
        "activity diagram",
        "state diagram",
        "component diagram",
        "plantuml",
    )
    return any(keyword in value for keyword in keywords)


def _build_diagram_reply(user_prompt: str, diagram_count: int = 1) -> str:
    context = retrieve_context(user_prompt, k=CONFIG.rag.top_k)
    uml_blocks = generate_plantuml(user_prompt, context=context, count=diagram_count)
    if not uml_blocks:
        raise RuntimeError("no valid PlantUML code was generated")

    renderer = PlantUMLRenderer()
    markdown_lines = ["Generated diagram(s) with PlantUML MCP:"]

    for index, block in enumerate(uml_blocks[:diagram_count], start=1):
        output_name = f"diagram_chat_{index}_{time.time_ns()}.png"
        saved_path = renderer.render(block, output_name)
        filename = Path(saved_path).name
        diagram_url = f"{request.host_url.rstrip('/')}/api/diagrams/{filename}"

        markdown_lines.append(f"\n### Diagram {index}")
        markdown_lines.append(f"![Diagram {index}]({diagram_url})")
        markdown_lines.append(f"[Open diagram {index}]({diagram_url})")

    return "\n".join(markdown_lines)


@app.get("/api/diagrams/<path:filename>")
def serve_diagram(filename: str):
    diagrams_dir = Path(CONFIG.outputs.diagrams_dir).resolve()
    return send_from_directory(diagrams_dir, filename)


@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages")
    if not isinstance(messages, list):
        return jsonify({"error": "messages must be an array"}), 400

    try:
        user_messages = [m.get("content", "").strip() for m in messages if m.get("role") == "user"]
        if not user_messages or not user_messages[-1]:
            return jsonify({"error": "last user message is required"}), 400

        latest_user_prompt = user_messages[-1]
        diagram_count = int(payload.get("diagramCount", 1))
        diagram_count = max(1, min(diagram_count, 3))

        force_diagram = bool(payload.get("forceDiagram", False))
        if force_diagram or _looks_like_diagram_request(latest_user_prompt):
            try:
                reply = _build_diagram_reply(latest_user_prompt, diagram_count=diagram_count)
            except Exception as diagram_error:
                logger.error(f"Diagram generation failed, falling back to text reply: {type(diagram_error).__name__}")
                prompt = _build_prompt(messages)
                client = get_client()
                text_reply = client.call(prompt)
                reply = (
                    "I couldn't render the diagram image right now, so here is a text response instead.\n\n"
                    f"{text_reply}"
                )
        else:
            prompt = _build_prompt(messages)
            client = get_client()
            reply = client.call(prompt)

        return jsonify({"reply": reply})
    except ValueError as err:
        return jsonify({"error": str(err)}), 400
    except Exception as err:
        return jsonify({"error": f"chat generation failed: {err}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
