"""
MCP Server - Model Context Protocol Server
Implements the MCP standard protocol via FastMCP.

This is the SINGLE SOURCE OF TRUTH for all tools.
All tool logic lives here and is exposed via MCP protocol.

Transport modes:
    python server.py              → stdio  (Claude Desktop / Copilot)
    python server.py --mode http  → HTTP SSE (web clients)
"""

import asyncio
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastmcp import FastMCP
from pydantic import BaseModel, Field

from config import CONFIG
from logger import logger

# ── Lazy imports to keep startup fast ────────────────────────────────────────

def _uml_generator():
    from llm.uml_generator import generate_plantuml
    return generate_plantuml

def _readme_generator():
    from llm.readme_generator import generate_readme
    return generate_readme

def _test_generator():
    from llm.test_generator import generate_tests
    return generate_tests

def _explainer():
    from llm.explainer import explain_code
    return explain_code

def _rag_retriever():
    from rag.retriever_v2 import RAGRetriever
    return RAGRetriever

def _plantuml_renderer():
    from mcp_tools.tools_v2 import PlantUMLRenderer
    return PlantUMLRenderer


# ── Global singletons (initialised on first use) ──────────────────────────────

_rag: Optional[Any] = None
_renderer: Optional[Any] = None



def get_rag():
    global _rag
    if _rag is None:
        logger.info("Initialising RAG retriever …")
        _rag = _rag_retriever()()
    return _rag


def get_renderer():
    global _renderer
    if _renderer is None:
        logger.info("Initialising PlantUML renderer …")
        _renderer = _plantuml_renderer()()
    return _renderer


# ── MCP Server ────────────────────────────────────────────────────────────────

mcp = FastMCP("PCD-FOC")


# ============================================================
# TOOLS
# ============================================================

@mcp.tool(
    name="generate_uml_diagram",
    description=(
        "Generate one or more PlantUML UML diagrams from a natural-language description. "
        "Returns image file paths and the raw PlantUML source for each diagram."
    ),
)
def generate_uml_diagram(
    description: str = Field(..., description="Natural-language description of the diagram"),
    diagram_type: str = Field(
        "auto",
        description="Diagram type: sequence | class | use-case | activity | component | auto",
    ),
    count: int = Field(1, ge=1, le=3, description="Number of diagrams to generate (1–3)"),
) -> Dict[str, Any]:
    logger.info(f"[tool] generate_uml_diagram  type={diagram_type}  count={count}")

    try:
        # 1. Retrieve RAG context
        rag = get_rag()
        context_docs, _scores = rag.retrieve(description, top_k=CONFIG.rag.top_k)
        context_text = "\n".join(context_docs)

        # 2. Generate PlantUML source via LLM
        generate_plantuml = _uml_generator()
        uml_blocks: Optional[List[str]] = generate_plantuml(
            description,
            context=context_text,
            count=count,
        )

        if not uml_blocks:
            return {"success": False, "error": "LLM produced no valid PlantUML blocks", "diagrams": []}

        # 3. Render each block to PNG
        renderer = get_renderer()
        diagrams: List[Dict[str, Any]] = []

        for idx, uml_code in enumerate(uml_blocks[:count], start=1):
            output_name = f"mcp_diagram_{idx}_{int(time.time() * 1000)}.png"
            saved_path = renderer.render(uml_code, output_name)
            diagrams.append(
                {
                    "index": idx,
                    "diagram_type": diagram_type,
                    "uml_source": uml_code,
                    "image_path": saved_path,
                }
            )

        return {"success": True, "count": len(diagrams), "diagrams": diagrams}

    except Exception as exc:
        logger.error(f"generate_uml_diagram failed: {exc}")
        return {"success": False, "error": str(exc), "diagrams": []}


@mcp.tool(
    name="generate_readme",
    description="Generate a README.md file for a project given its description and primary language.",
)
def generate_readme_tool(
    project_description: str = Field(..., description="Project description or source code"),
    language: str = Field("python", description="Primary programming language"),
) -> Dict[str, Any]:
    logger.info(f"[tool] generate_readme  lang={language}")

    try:
        gen = _readme_generator()
        content = gen(project_description, language)
        return {"success": True, "content": content, "language": language}
    except Exception as exc:
        logger.error(f"generate_readme failed: {exc}")
        return {"success": False, "error": str(exc)}


@mcp.tool(
    name="generate_unit_tests",
    description=(
        "Generate unit tests for the provided source code. "
        "Language and framework are auto-detected when omitted."
    ),
)
def generate_unit_tests(
    code: str = Field(..., description="Source code to be tested"),
    language: str = Field("python", description="Language: python | javascript | typescript | java | go | rust"),
    framework: Optional[str] = Field(None, description="Test framework (e.g. pytest, jest). Auto-selected if omitted."),
) -> Dict[str, Any]:
    logger.info(f"[tool] generate_unit_tests  lang={language}  framework={framework}")

    try:
        gen = _test_generator()
        content = gen(code, language, framework)
        return {
            "success": True,
            "content": content,
            "language": language,
            "framework": framework or "auto",
        }
    except Exception as exc:
        logger.error(f"generate_unit_tests failed: {exc}")
        return {"success": False, "error": str(exc)}


@mcp.tool(
    name="explain_code",
    description="Return a clear explanation of a code snippet at the requested detail level.",
)
def explain_code_tool(
    code: str = Field(..., description="Code snippet to explain"),
    detail_level: str = Field("medium", description="Explanation depth: low | medium | high"),
) -> Dict[str, Any]:
    logger.info(f"[tool] explain_code  level={detail_level}")

    try:
        explain = _explainer()
        explanation = explain(code, detail_level)
        return {"success": True, "explanation": explanation, "detail_level": detail_level}
    except Exception as exc:
        logger.error(f"explain_code failed: {exc}")
        return {"success": False, "error": str(exc)}


@mcp.tool(
    name="search_similar_examples",
    description="Semantic search over the knowledge base for examples similar to a query.",
)
def search_similar_examples(
    query: str = Field(..., description="Natural-language search query"),
    top_k: int = Field(3, ge=1, le=10, description="Number of results to return"),
) -> Dict[str, Any]:
    logger.info(f"[tool] search_similar_examples  k={top_k}")

    try:
        rag = get_rag()
        docs, scores = rag.retrieve(query, top_k=top_k)
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


@mcp.tool(
    name="detect_language",
    description="Detect the programming language of a source code snippet.",
)
def detect_language(
    code: str = Field(..., description="Source code to analyse"),
) -> Dict[str, Any]:
    """Regex-based language detection — no LLM required."""
    import re

    patterns: Dict[str, List[str]] = {
        "python":     [r"^def\s+\w+\s*\(", r"^class\s+\w+\s*:", r"import\s+\w+", r"from\s+\w+\s+import", r"if\s+__name__\s*=="],
        "javascript": [r"^const\s+\w+\s*=", r"^let\s+\w+\s*=", r"^function\s+\w+\s*\(", r"require\s*\(", r"module\.exports"],
        "typescript": [r":\s*(string|number|boolean|any)\s*[=;)]", r"^interface\s+\w+", r"^type\s+\w+\s*="],
        "java":       [r"^public\s+class\s+\w+", r"^import\s+java\.", r"System\.out\.println", r"@Override"],
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


@mcp.tool(
    name="select_test_framework",
    description="Return the recommended test framework and file extension for a language.",
)
def select_test_framework(
    language: str = Field(..., description="Programming language"),
    preferred: Optional[str] = Field(None, description="Preferred framework name (optional)"),
) -> Dict[str, Any]:
    frameworks = {
        "python":     {"pytest": ".py",        "unittest": ".py"},
        "javascript": {"jest":  ".test.js",    "mocha":    ".test.js"},
        "typescript": {"jest":  ".test.ts",    "vitest":   ".test.ts"},
        "java":       {"junit": "Test.java",   "testng":   "Test.java"},
        "go":         {"go test": "_test.go"},
        "rust":       {"cargo test": "_test.rs"},
        "csharp":     {"nunit": "Tests.cs",    "xunit":    "Tests.cs"},
        "php":        {"phpunit": "Test.php"},
        "ruby":       {"rspec": "_spec.rb"},
    }

    lang = language.lower()
    if lang not in frameworks:
        return {"success": False, "error": f"Language '{lang}' not supported"}

    available = frameworks[lang]
    selected = preferred.lower() if preferred and preferred.lower() in available else next(iter(available))

    return {
        "success": True,
        "language": lang,
        "framework": selected,
        "extension": available[selected],
        "available_frameworks": list(available.keys()),
    }


# ============================================================
# RESOURCES  (read-only configuration snapshots)
# ============================================================

@mcp.resource("config://ollama")
def resource_ollama_config() -> Dict[str, Any]:
    """Current Ollama configuration."""
    return {
        "url": CONFIG.ollama.url,
        "model": CONFIG.ollama.model,
        "timeout": CONFIG.ollama.timeout,
        "temperature": CONFIG.ollama.temperature,
    }


@mcp.resource("config://plantuml")
def resource_plantuml_config() -> Dict[str, Any]:
    """Current PlantUML configuration."""
    return {
        "server_url": CONFIG.plantuml.server_url,
        "use_local": CONFIG.plantuml.use_local,
        "timeout": CONFIG.plantuml.timeout,
        "output_dir": CONFIG.plantuml.output_dir,
    }


@mcp.resource("config://rag")
def resource_rag_config() -> Dict[str, Any]:
    """Current RAG configuration."""
    return {
        "embedding_model": CONFIG.rag.embedding_model,
        "top_k": CONFIG.rag.top_k,
        "min_similarity": CONFIG.rag.min_similarity,
    }


# ============================================================
# PROMPTS  (reusable prompt templates)
# ============================================================

@mcp.prompt(name="uml_template")
def prompt_uml_template(purpose: str = "sequence") -> str:
    """Prompt template for UML diagram generation."""
    templates = {
        "sequence": (
            "Generate a PlantUML sequence diagram for:\n{description}\n\n"
            "Use: -> (sync), --> (async), activate/deactivate, alt/else."
        ),
        "class": (
            "Generate a PlantUML class diagram for:\n{description}\n\n"
            "Use: class, +public, -private, <| for inheritance."
        ),
        "activity": (
            "Generate a PlantUML activity diagram for:\n{description}\n\n"
            "Use: start/stop, :action:, -> for transitions."
        ),
    }
    return templates.get(purpose, templates["sequence"])


# ============================================================
# Entry point
# ============================================================

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="PCD-FOC MCP Server")
    parser.add_argument("--mode", "-m", choices=["stdio", "http"], default="stdio",
                        help="Transport mode (default: stdio)")
    parser.add_argument("--host", default="0.0.0.0", help="HTTP host")
    parser.add_argument("--port", "-p", type=int, default=8000, help="HTTP port")
    args = parser.parse_args()

    logger.info(f"Starting MCP server  mode={args.mode}  model={CONFIG.ollama.model}")

    if args.mode == "http":
        # SSE transport — usable by any HTTP MCP client
        mcp.run(transport="sse", host=args.host, port=args.port)
    else:
        # stdio transport — for Claude Desktop, Copilot, etc.
        mcp.run(transport="stdio")


if __name__ == "__main__":
    main()