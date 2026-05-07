"""Code explainer — produces a human-readable explanation of source code."""
from pathlib import Path
from typing import Optional
from logger import logger
from errors import OllamaError
from llm.ollama_client import get_client


_PROMPT_TEMPLATE = """\
You are a senior software engineer and educator.

Explain the following source code for a {detail_level} level audience.

Use this level of depth:
- low: concise, high-level overview with the main flow
- medium: balanced explanation with key components and flow
- high: detailed explanation with flow, decisions, edge cases, and improvements

Structure your explanation with these sections:

## What This Code Does
A high-level summary (3-5 sentences).

## Key Components
Describe each major class, function, or module and its responsibility.

## How It Works — Step by Step
Walk through the execution flow from entry point to output.

## Design Patterns & Decisions
Mention any notable patterns (e.g. singleton, decorator, retry logic, RAG pipeline, etc.).
## Complexity
Discuss time and space complexity, and any potential bottlenecks.
## Potential Issues / Improvements
List any bugs, edge-cases, or areas for improvement you notice.
Give a score to it out of 10 for code quality, maintainability, and clarity, and explain your reasoning.


RULES:
- Use plain English; avoid jargon where possible.
- Use code snippets (``` ```) to illustrate specific lines when helpful.
- Output ONLY the explanation content in Markdown — no preamble.

SOURCE CODE:
-----------
{code}
-----------
"""


def _resolve_detail_level(value: str) -> str:
    if value in {"low", "medium", "high"}:
        return value
    return "medium"


def _resolve_output_name(output_name: str, detail_level: str) -> str:
    if output_name in {"low", "medium", "high"}:
        return f"{detail_level}.md"
    if not output_name.lower().endswith(".md"):
        return f"{output_name}.md"
    return output_name


def explain_code(code: str, output_name: str = "explanation.md", detail_level: str = None) -> Optional[str]:
    """
    Produce a structured explanation of source code.

    Args:
        code:        Raw source code.
        output_name: Filename saved under outputs/explanations/ or a detail level
                     shorthand (low | medium | high).
        detail_level: Optional explicit detail level override: low | medium | high.

    Returns:
        The path to the saved explanation file, or None on failure.
    """
    from config import CONFIG

    client = get_client()
    # Resolve detail level: explicit override wins, otherwise infer from output_name
    if detail_level is None:
        detail_level = _resolve_detail_level(output_name)
    else:
        detail_level = _resolve_detail_level(detail_level)

    file_name = _resolve_output_name(output_name, detail_level)
    prompt = _PROMPT_TEMPLATE.format(code=code, detail_level=detail_level)

    logger.info("Generating code explanation …")
    try:
        response = client.call(prompt, temperature=0.2)
    except OllamaError as e:
        logger.error(f"Explanation generation failed: {e}")
        return None

    out_path = Path(CONFIG.outputs.explanations_dir) / file_name
    try:
        out_path.write_text(response, encoding="utf-8")
        logger.info(f"Explanation saved → {out_path}")
        return str(out_path)
    except Exception as e:
        logger.error(f"Failed to save explanation: {e}")
        return None
