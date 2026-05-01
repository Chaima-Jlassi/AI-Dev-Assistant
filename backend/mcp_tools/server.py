"""
mcp_tools/server.py — MCP Server (single source of truth for all tools)
========================================================================
Transport modes:
    python -m mcp_tools.server               → stdio  (Claude Desktop / Copilot)
    python -m mcp_tools.server --mode http   → HTTP/SSE (web clients, port 8001)

All tool logic lives here and is exposed via the MCP protocol.
No other file should call LLMs or PlantUML directly.
"""

import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── Make sure the backend root is on sys.path when run directly ───────────────
_HERE = Path(__file__).resolve().parent          # …/backend/mcp_tools/
_ROOT = _HERE.parent                             # …/backend/
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from fastmcp import FastMCP

from config import CONFIG
from logger import logger


# ── Lazy imports (keep startup fast, errors surface at call-time) ─────────────

def _get_generate_plantuml():
    from llm.uml_generator import generate_plantuml
    return generate_plantuml

def _get_generate_readme():
    from llm.readme_generator import generate_readme
    return generate_readme

def _get_generate_tests():
    from llm.test_generator import generate_tests
    return generate_tests

def _get_explain_code():
    from llm.explainer import explain_code
    return explain_code

def _get_rag_retriever():
    from rag.retriever_v2 import RAGRetriever
    return RAGRetriever

def _get_plantuml_renderer():
    from mcp_tools.tools_v2 import PlantUMLRenderer   # correct package path
    return PlantUMLRenderer


# ── Singletons ────────────────────────────────────────────────────────────────

_rag = None
_renderer = None

def _rag():
    global _rag
    if _rag is None:
        logger.info("Initialising RAG retriever …")
        _rag = _get_rag_retriever()()
    return _rag

def _renderer():
    global _renderer
    if _renderer is None:
        logger.info("Initialising PlantUML renderer …")
        _renderer = _get_plantuml_renderer()()
    return _renderer


# ── MCP Server instance ───────────────────────────────────────────────────────

mcp = FastMCP("PCD-FOC")


# =============================================================================
# TOOLS
# FastMCP tools must use plain type annotations — NOT Field() as defaults.
# =============================================================================

@mcp.tool()
def generate_uml_diagram(description: str, diagram_type: str = "auto", count: int = 1) -> Dict[str, Any]:
    """
    Generate one or more PlantUML UML diagrams from a natural-language description.
    Returns image file paths and raw PlantUML source for each diagram.

    Args:
        description: Natural-language description of the diagram to generate.
        diagram_type: sequence | class | use-case | activity | component | auto
        count: Number of diagrams to generate (1 to 3).
    """
    logger.info(f"[tool] generate_uml_diagram  type={diagram_type}  count={count}")
    count = max(1, min(count, 3))

    try:
        # 1. RAG context
        rag = _rag()
        context_docs, _ = rag.retrieve(description, top_k=CONFIG.rag.top_k)
        context_text = "\n".join(context_docs)

        # 2. LLM → PlantUML source
        generate_plantuml = _get_generate_plantuml()
        uml_blocks: Optional[List[str]] = generate_plantuml(
            description, context=context_text, count=count, diagram_type=diagram_type
        )
        if not uml_blocks:
            return {"success": False, "error": "LLM produced no valid PlantUML blocks", "diagrams": []}

        # 3. Render each block → PNG
        renderer = _renderer()
        diagrams: List[Dict[str, Any]] = []
        for idx, uml_code in enumerate(uml_blocks[:count], start=1):
            output_name = f"mcp_diagram_{idx}_{int(time.time() * 1000)}.png"
            saved_path = renderer.render(uml_code, output_name)
            diagrams.append({
                "index": idx,
                "diagram_type": diagram_type,
                "uml_source": uml_code,
                "image_path": saved_path,
            })

        return {"success": True, "count": len(diagrams), "diagrams": diagrams}

    except Exception as exc:
        logger.error(f"generate_uml_diagram failed: {exc}")
        return {"success": False, "error": str(exc), "diagrams": []}


@mcp.tool()
def generate_readme(project_description: str, language: str = "python") -> Dict[str, Any]:
    """
    Generate a README.md for a project given its description and primary language.

    Args:
        project_description: Project description or pasted source code.
        language: Primary programming language (e.g. python, javascript).
    """
    logger.info(f"[tool] generate_readme  lang={language}")
    try:
        gen = _get_generate_readme()
        saved_path = gen(project_description, output_name="_mcp_readme_tmp.md")
        if saved_path:
            tmp = Path(saved_path)
            content = tmp.read_text(encoding="utf-8")
            try:
                tmp.unlink()
            except Exception:
                pass
            return {"success": True, "content": content, "language": language}
        return {"success": False, "error": "README generation returned no output"}
    except Exception as exc:
        logger.error(f"generate_readme failed: {exc}")
        return {"success": False, "error": str(exc)}


@mcp.tool()
def generate_unit_tests(code: str, language: str = "python", framework: str = "") -> Dict[str, Any]:
    """
    Generate unit tests for the provided source code.
    Language and framework are auto-detected when omitted.

    Args:
        code: Source code to be tested.
        language: Programming language (python | javascript | typescript | java | go | rust).
        framework: Test framework, e.g. pytest, jest. Leave blank for auto-detection.
    """
    logger.info(f"[tool] generate_unit_tests  lang={language}  framework={framework or 'auto'}")
    try:
        gen = _get_generate_tests()
        saved_path = gen(
            code,
            output_name="_mcp_tests_tmp.py",
            language=language,
            framework=framework or None,
        )
        if saved_path:
            tmp = Path(saved_path)
            content = tmp.read_text(encoding="utf-8")
            try:
                tmp.unlink()
            except Exception:
                pass
            return {
                "success": True,
                "content": content,
                "language": language,
                "framework": framework or "auto",
            }
        return {"success": False, "error": "Test generation returned no output"}
    except Exception as exc:
        logger.error(f"generate_unit_tests failed: {exc}")
        return {"success": False, "error": str(exc)}


@mcp.tool()
def explain_code(code: str, detail_level: str = "medium") -> Dict[str, Any]:
    """
    Return a clear Markdown explanation of a code snippet.

    Args:
        code: Source code snippet to explain.
        detail_level: Explanation depth — low | medium | high.
    """
    logger.info(f"[tool] explain_code  level={detail_level}")
    try:
        explain = _get_explain_code()
        saved_path = explain(
            code,
            output_name="_mcp_explain_tmp.md",
            detail_level=detail_level,
        )
        if saved_path:
            tmp = Path(saved_path)
            content = tmp.read_text(encoding="utf-8")
            try:
                tmp.unlink()   # clean up tmp file
            except Exception:
                pass
            if not content.strip():
                return {"success": False, "error": "explain_code produced empty explanation"}
            return {"success": True, "explanation": content, "detail_level": detail_level}
        return {"success": False, "error": "Explanation returned no output"}
    except Exception as exc:
        logger.error(f"explain_code failed: {exc}")
        return {"success": False, "error": str(exc)}


@mcp.tool()
def search_similar_examples(query: str, top_k: int = 3) -> Dict[str, Any]:
    """
    Semantic search over the knowledge base for examples similar to a query.

    Args:
        query: Natural-language search query.
        top_k: Number of results to return (1–10).
    """
    logger.info(f"[tool] search_similar_examples  k={top_k}")
    try:
        rag = _rag()
        docs, scores = rag.retrieve(query, top_k=max(1, min(top_k, 10)))
        return {
            "success": True,
            "query": query,
            "count": len(docs),
            "examples": [
                {"content": doc, "score": float(score)}
                for doc, score in zip(docs, scores)
            ],
        }
    except Exception as exc:
        logger.error(f"search_similar_examples failed: {exc}")
        return {"success": False, "error": str(exc)}


@mcp.tool()
def detect_language(code: str) -> Dict[str, Any]:
    """
    Detect the programming language of a source code snippet using regex patterns.
    No LLM call required.

    Args:
        code: Source code to analyse.
    """
    import re

    patterns: Dict[str, List[str]] = {
        "python":     [r"^def\s+\w+\s*\(", r"^class\s+\w+\s*:", r"^import\s+\w+",
                       r"^from\s+\w+\s+import", r"if\s+__name__\s*=="],
        "javascript": [r"^const\s+\w+\s*=", r"^let\s+\w+\s*=", r"^function\s+\w+\s*\(",
                       r"require\s*\(", r"module\.exports"],
        "typescript": [r":\s*(string|number|boolean|any)\s*[=;)]",
                       r"^interface\s+\w+", r"^type\s+\w+\s*="],
        "java":       [r"^public\s+class\s+\w+", r"^import\s+java\.",
                       r"System\.out\.println", r"@Override"],
        "go":         [r"^package\s+\w+", r"^func\s+\w+\s*\(", r":="],
        "rust":       [r"^fn\s+\w+\s*\(", r"^let\s+mut\s+", r"^impl\s+\w+", r"#\[derive\("],
        "csharp":     [r"^using\s+System", r"^namespace\s+\w+", r"Console\.WriteLine"],
        "php":        [r"<\?php", r"\$\w+\s*=", r"->\w+\("],
    }

    scores = {
        lang: sum(1 for p in pats if re.search(p, code, re.MULTILINE))
        for lang, pats in patterns.items()
    }
    scores = {lang: s for lang, s in scores.items() if s > 0}

    if not scores:
        return {"success": True, "language": "unknown", "confidence": 0.0}

    best = max(scores, key=scores.get)
    confidence = round(min(scores[best] / len(patterns[best]), 1.0), 2)
    return {"success": True, "language": best, "confidence": confidence, "all_scores": scores}


@mcp.tool()
def select_test_framework(language: str, preferred: str = "") -> Dict[str, Any]:
    """
    Return the recommended test framework and file extension for a given language.

    Args:
        language: Programming language name.
        preferred: Preferred framework name (optional, leave blank for default).
    """
    frameworks: Dict[str, Dict[str, str]] = {
        "python":     {"pytest": ".py",         "unittest": ".py"},
        "javascript": {"jest":   ".test.js",    "mocha":    ".test.js"},
        "typescript": {"jest":   ".test.ts",    "vitest":   ".test.ts"},
        "java":       {"junit":  "Test.java",   "testng":   "Test.java"},
        "go":         {"go test": "_test.go"},
        "rust":       {"cargo test": "_test.rs"},
        "csharp":     {"nunit":  "Tests.cs",    "xunit":    "Tests.cs"},
        "php":        {"phpunit": "Test.php"},
        "ruby":       {"rspec":  "_spec.rb"},
    }

    lang = language.lower()
    if lang not in frameworks:
        return {"success": False, "error": f"Language '{lang}' not supported"}

    available = frameworks[lang]
    pref = preferred.lower() if preferred else ""
    selected = pref if pref in available else next(iter(available))

    return {
        "success": True,
        "language": lang,
        "framework": selected,
        "extension": available[selected],
        "available_frameworks": list(available.keys()),
    }


# =============================================================================
# RESOURCES  (read-only config snapshots)
# =============================================================================

@mcp.resource("config://ollama")
def resource_ollama() -> Dict[str, Any]:
    """Current Ollama configuration."""
    return {
        "url": CONFIG.ollama.url,
        "model": CONFIG.ollama.model,
        "timeout": CONFIG.ollama.timeout,
        "temperature": CONFIG.ollama.temperature,
    }

@mcp.resource("config://plantuml")
def resource_plantuml() -> Dict[str, Any]:
    """Current PlantUML configuration."""
    return {
        "server_url": CONFIG.plantuml.server_url,
        "use_local": CONFIG.plantuml.use_local,
        "timeout": CONFIG.plantuml.timeout,
        "output_dir": CONFIG.plantuml.output_dir,
    }

@mcp.resource("config://rag")
def resource_rag() -> Dict[str, Any]:
    """Current RAG configuration."""
    return {
        "embedding_model": CONFIG.rag.embedding_model,
        "top_k": CONFIG.rag.top_k,
        "min_similarity": CONFIG.rag.min_similarity,
    }


# =============================================================================
# PROMPTS
# =============================================================================

@mcp.prompt()
def uml_template(purpose: str = "sequence") -> str:
    """Reusable PlantUML prompt templates."""
    templates = {
        "sequence": (
            "Generate a PlantUML sequence diagram for:\n{description}\n\n"
            "Rules: use -> (sync), --> (async), activate/deactivate, alt/else."
        ),
        "class": (
            "Generate a PlantUML class diagram for:\n{description}\n\n"
            "Rules: use class keyword, +public, -private, <| for inheritance."
        ),
        "activity": (
            "Generate a PlantUML activity diagram for:\n{description}\n\n"
            "Rules: use start/stop, :action:, -> for transitions."
        ),
    }
    return templates.get(purpose, templates["sequence"])


# =============================================================================
# Entry point
# =============================================================================

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="PCD-FOC MCP Server")
    parser.add_argument("--mode", "-m", choices=["stdio", "http"],
                        default="stdio", help="Transport (default: stdio)")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", "-p", type=int, default=8001,
                        help="HTTP port (default: 8001, Flask API uses 8000)")
    args = parser.parse_args()

    logger.info(f"Starting MCP server  mode={args.mode}  model={CONFIG.ollama.model}")

    if args.mode == "http":
        mcp.run(transport="sse", host=args.host, port=args.port)
    else:
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()