"""
PCD-FOC — Main interactive CLI
Supports four modes in one persistent session:
  1. Generate UML diagrams
  2. Generate README from code
  3. Generate test cases from code
  4. Explain code
The Ollama client is created ONCE and reused across all operations.
"""
import sys
import time
from pathlib import Path
from typing import Optional

from config import CONFIG
from logger import logger
from errors import OllamaError, PlantUMLError
from llm.ollama_client import get_client          # singleton — created here, reused everywhere


# ── lazy imports of feature modules (so startup is fast) ─────────────────────
def _readme():
    from llm.readme_generator import generate_readme
    return generate_readme

def _tests():
    from llm.test_generator import generate_tests
    return generate_tests

def _explain():
    from llm.explainer import explain_code
    return explain_code

def _uml():
    from llm.uml_generator import generate_plantuml
    return generate_plantuml

def _retriever():
    from rag.retriever_v2 import retrieve_context
    return retrieve_context

def _renderer():
    from mcp.tools_v2 import PlantUMLRenderer
    return PlantUMLRenderer


# ── helpers ───────────────────────────────────────────────────────────────────

SEPARATOR = "=" * 60

def _hr():
    print(SEPARATOR)

def _banner(text: str):
    _hr()
    print(f"  {text}")
    _hr()


def _read_code_from_user() -> Optional[str]:
    """
    Ask the user for code input.
    They can:
      • Type / paste lines and finish with a line containing only END
      • Provide a file path
    """
    print("\nHow would you like to provide the code?")
    print("  [1] Paste / type code  (finish with a line containing just: END)")
    print("  [2] Provide a file path")
    choice = input("> ").strip()

    if choice == "2":
        path_str = input("File path: ").strip()
        p = Path(path_str)
        if not p.exists():
            print(f"❌  File not found: {p}")
            return None
        try:
            code = p.read_text(encoding="utf-8")
            print(f"  Read {len(code)} chars from {p}")
            return code
        except Exception as e:
            print(f"  Could not read file: {e}")
            return None
    else:
        print("Paste your code below. Type END on its own line when done:\n")
        lines = []
        while True:
            try:
                line = input()
            except EOFError:
                break
            if line.strip() == "END":
                break
            lines.append(line)
        code = "\n".join(lines)
        if not code.strip():
            print("  No code received.")
            return None
        print(f" Received {len(code)} chars")
        return code


def _slugify(text: str, maxlen: int = 40) -> str:
    """Turn a free-text string into a safe filename fragment."""
    import re
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s_-]+", "_", s).strip("_")
    return s[:maxlen]


# ── feature handlers ──────────────────────────────────────────────────────────

def handle_diagram():
    """UML diagram generation (original feature, preserved intact)."""
    _banner("🖼️  UML Diagram Generator")

    user_input = input("Describe the diagram you want:\n> ").strip()
    if not user_input:
        print("  Empty request.")
        return

    count_raw = input("How many diagrams? [1]\n> ").strip()
    try:
        count = int(count_raw) if count_raw else 1
    except ValueError:
        count = 1

    print("\n Retrieving context …")
    try:
        retrieve_context = _retriever()
        context = retrieve_context(user_input, k=CONFIG.rag.top_k)
        if not context:
            context = "(no examples found)"
    except Exception as e:
        logger.warning(f"RAG retrieval failed: {e}")
        context = "(no examples found)"

    print(" Generating PlantUML …")
    try:
        generate_plantuml = _uml()
        uml_blocks = generate_plantuml(user_input, context, count=count)
    except OllamaError as e:
        print(f"  LLM error: {e}")
        print("💡  Make sure Ollama is running: ollama serve")
        return

    if not uml_blocks:
        print("  No valid UML generated.")
        return

    print(f"  Generated {len(uml_blocks)} block(s). Rendering …")
    PlantUMLRenderer = _renderer()
    renderer = PlantUMLRenderer()
    timestamp = int(time.time() * 1000)
    saved = []

    for i, block in enumerate(uml_blocks, start=1):
        fname = f"diagram_{timestamp}_{i}.png"
        try:
            path = renderer.render(block, fname)
            saved.append(path)
            print(f"    [{i}] {Path(path).absolute()}")
        except PlantUMLError as e:
            print(f"    [{i}] Render failed: {e}")

    if saved:
        print(f"\n  {len(saved)} diagram(s) saved in {CONFIG.outputs.diagrams_dir}/")
    else:
        print("  No diagrams rendered successfully.")


def handle_readme():
    """README generation from source code."""
    _banner("  README Generator")

    code = _read_code_from_user()
    if not code:
        return

    slug = _slugify(input("Short project name (for filename) [project]: ").strip() or "project")
    output_name = f"README_{slug}.md"

    print("\n Generating README …")
    generate_readme = _readme()
    path = generate_readme(code, output_name=output_name)

    if path:
        print(f"\n  README saved → {path}")
    else:
        print("  README generation failed. Check logs.")


def handle_tests():
    """Test-case generation from source code."""
    _banner("  Test Case Generator")

    code = _read_code_from_user()
    if not code:
        return

    slug = _slugify(input("Short name for the test file (no extension) [generated]: ").strip() or "generated")
    # extension will be decided by the LLM; pass None so the generator appends the right one
    output_name = None  # auto-determined inside generate_tests based on detected framework

    # But we still want a sensible prefix
    import re
    from llm.test_generator import _detect_framework
    print("\n Detecting language and framework …")
    lang, framework, ext = _detect_framework(code)
    print(f"   Detected: {lang} → {framework}")
    output_name = f"{slug}{ext}"

    print(f" Generating {framework} tests …")
    generate_tests = _tests()
    path = generate_tests(code, output_name=output_name)

    if path:
        print(f"\n  Tests saved → {path}")
        print(f"   Framework: {framework}")
    else:
        print(" Test generation failed. Check logs.")


def handle_explain():
    """Code explanation."""
    _banner("  Code Explainer")

    code = _read_code_from_user()
    if not code:
        return

    slug = _slugify(input("Short name for output file [explanation]: ").strip() or "explanation")
    output_name = f"{slug}.md"

    print("\n Generating explanation …")
    explain_code = _explain()
    path = explain_code(code, output_name=output_name)

    if path:
        print(f"\n  Explanation saved → {path}")
    else:
        print("  Explanation failed. Check logs.")


# ── main menu loop ────────────────────────────────────────────────────────────

_MENU = """
What would you like to do?

  [1] Generate UML diagram(s)
  [2] Generate README from code
  [3] Generate test cases from code
  [4] Explain code
  [q] Quit
"""

_HANDLERS = {
    "1": handle_diagram,
    "2": handle_readme,
    "3": handle_tests,
    "4": handle_explain,
}


def main():
    print("\n" + SEPARATOR)
    print("  Welcome to PCD-FOC — Your AI Dev Assistant")
    print(SEPARATOR)

    # Warm up the Ollama connection once — shared for the whole session
    print("\n Connecting to Ollama …")
    try:
        client = get_client()   # creates the singleton
        # lightweight ping
        client.call("Say OK", temperature=0.0)
        print("✅  Ollama connected and ready\n")
    except OllamaError as e:
        print(f"   Could not reach Ollama: {e}")
        print("    Continuing anyway — make sure 'ollama serve' is running.\n")
    except Exception as e:
        print(f"   Unexpected startup error: {e}\n")

    while True:
        print(_MENU)
        choice = input("> ").strip().lower()

        if choice in ("q", "quit", "exit"):
            print("\n Goodbye!")
            break

        handler = _HANDLERS.get(choice)
        if handler is None:
            print(" Invalid choice. Please enter 1, 2, 3, 4, or q.")
            continue

        try:
            handler()
        except KeyboardInterrupt:
            print("\n\n   Interrupted. Returning to menu …")
        except Exception as e:
            logger.error(f"Unhandled error in handler: {e}")
            if CONFIG.debug:
                import traceback; traceback.print_exc()
            print(f"  Something went wrong: {e}")

        input("\nPress Enter to continue …")


if __name__ == "__main__":
    main()
