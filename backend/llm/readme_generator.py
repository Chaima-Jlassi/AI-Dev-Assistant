"""README generator — reads source code, produces a markdown README."""
from pathlib import Path
from typing import Optional
from logger import logger
from errors import OllamaError
from llm.ollama_client import get_client


_PROMPT_TEMPLATE = """\
You are a senior software engineer and technical writer.

Read the source code below and generate a comprehensive, well-structured README.md file.

The README MUST contain these sections (use proper Markdown headers):
1. # Project Title  — infer a clean title from the code
2. ## Overview      — what the project does, in 2-4 sentences
3. ## Features      — bullet list of key capabilities
4. ## Project Structure — describe files/folders and their roles
5. ## Requirements  — dependencies and environment (infer from imports)
6. ## Installation  — step-by-step setup commands
7. ## Usage         — how to run / use the code, with example commands
8. ## Configuration — env vars or config options (if any)
9. ## Architecture  — brief description of how components interact
10. ## License      — MIT unless you can infer otherwise

RULES:
- Output ONLY the Markdown content, no extra commentary.
- Be precise; do not invent features not present in the code.
- Use code blocks (``` ```) for commands and code snippets.

SOURCE CODE:
-----------
{code}
-----------
"""


def generate_readme(code: str, output_name: str = "README.md") -> Optional[str]:
    """
    Generate a README.md from source code.

    Args:
        code:        Raw source code (one or multiple files concatenated).
        output_name: Filename to save under outputs/readme/.

    Returns:
        Absolute path to the saved file, or None on failure.
    """
    from config import CONFIG

    client = get_client()
    prompt = _PROMPT_TEMPLATE.format(code=code)

    logger.info("Generating README from code …")
    try:
        response = client.call(prompt, temperature=0.2)
    except OllamaError as e:
        logger.error(f"README generation failed: {e}")
        return None

    out_path = Path(CONFIG.outputs.readme_dir) / output_name
    try:
        out_path.write_text(response, encoding="utf-8")
        logger.info(f"README saved → {out_path}")
        return str(out_path.absolute())
    except Exception as e:
        logger.error(f"Failed to save README: {e}")
        return None
