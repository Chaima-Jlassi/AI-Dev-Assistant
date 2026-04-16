"""Code explainer — produces a human-readable explanation of source code."""
from pathlib import Path
from typing import Optional
from logger import logger
from errors import OllamaError
from llm.ollama_client import get_client


_PROMPT_TEMPLATE = """\
You are a senior software engineer and educator.

Explain the following source code clearly and thoroughly for a developer who has not seen it before.

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


def explain_code(code: str, output_name: str = "explanation.md") -> Optional[str]:
    """
    Produce a structured explanation of source code.

    Args:
        code:        Raw source code.
        output_name: Filename saved under outputs/explanations/.

    Returns:
        Absolute path to the saved file, or None on failure.
    """
    from config import CONFIG

    client = get_client()
    prompt = _PROMPT_TEMPLATE.format(code=code)

    logger.info("Generating code explanation …")
    try:
        response = client.call(prompt, temperature=0.2)
    except OllamaError as e:
        logger.error(f"Explanation generation failed: {e}")
        return None

    out_path = Path(CONFIG.outputs.explanations_dir) / output_name
    try:
        out_path.write_text(response, encoding="utf-8")
        logger.info(f"Explanation saved → {out_path}")
        return str(out_path.absolute())
    except Exception as e:
        logger.error(f"Failed to save explanation: {e}")
        return None
