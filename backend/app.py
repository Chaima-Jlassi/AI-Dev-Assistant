"""
app.py — Interactive CLI
========================
All AI work is delegated to the MCP server via MCPClient.
No direct LLM / PlantUML / RAG calls here.
"""

import sys
import time
from pathlib import Path
from typing import Optional

from config import CONFIG
from mcp_tools.mcp_client import get_mcp_client  # ← single import for all AI work

SEPARATOR = "=" * 60


def _hr():   print(SEPARATOR)
def _banner(text: str): _hr(); print(f"  {text}"); _hr()


def _read_code_from_user() -> Optional[str]:
    print("\nHow would you like to provide the code?")
    print("  [1] Paste / type code  (finish with a line containing just: END)")
    print("  [2] Provide a file path")
    choice = input("> ").strip()

    if choice == "2":
        path_str = input("File path: ").strip()
        p = Path(path_str)
        if not p.exists():
            print(f"  File not found: {p}")
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
        print(f"  Received {len(code)} chars")
        return code


def _slugify(text: str, maxlen: int = 40) -> str:
    import re
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s_-]+", "_", s).strip("_")
    return s[:maxlen]


# ── Feature handlers ──────────────────────────────────────────────────────────

def handle_diagram():
    _banner("UML Diagram Generator")

    user_input = input("Describe the diagram you want:\n> ").strip()
    if not user_input:
        print("  Empty request.")
        return

    count_raw = input("How many diagrams? [1]\n> ").strip()
    try:
        count = int(count_raw) if count_raw else 1
    except ValueError:
        count = 1

    diagram_type = input("Diagram type? [auto / sequence / class / activity / component]\n> ").strip() or "auto"

    print("\n  Calling MCP: generate_uml_diagram …")
    mcp = get_mcp_client()
    result = mcp.generate_uml_diagram(
        description=user_input,
        diagram_type=diagram_type,
        count=count,
    )

    if not result.get("success"):
        print(f"  Error: {result.get('error')}")
        return

    for d in result.get("diagrams", []):
        print(f"  [{d['index']}] Saved → {d['image_path']}")
    print(f"\n  {result['count']} diagram(s) saved in {CONFIG.outputs.diagrams_dir}/")


def handle_readme():
    _banner("README Generator")

    code = _read_code_from_user()
    if not code:
        return

    language = input("Primary language [python]: ").strip() or "python"

    print("\n  Calling MCP: generate_readme …")
    mcp = get_mcp_client()
    result = mcp.generate_readme(project_description=code, language=language)

    if not result.get("success"):
        print(f"  Error: {result.get('error')}")
        return

    # Save locally
    slug = _slugify(input("Short project name (for filename) [project]: ").strip() or "project")
    output_path = Path(CONFIG.outputs.docs_dir) / f"README_{slug}.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result["content"], encoding="utf-8")
    print(f"\n  README saved → {output_path}")


def handle_tests():
    _banner("Test Case Generator")

    code = _read_code_from_user()
    if not code:
        return

    # Let MCP detect language first
    print("\n  Calling MCP: detect_language …")
    mcp = get_mcp_client()
    lang_result = mcp.detect_language(code)
    detected_lang = lang_result.get("language", "python")
    print(f"  Detected language: {detected_lang}  (confidence {lang_result.get('confidence', 0):.0%})")

    language = input(f"Override language? [{detected_lang}]: ").strip() or detected_lang

    # Let MCP select framework
    print("  Calling MCP: select_test_framework …")
    fw_result = mcp.select_test_framework(language)
    default_fw = fw_result.get("framework", "pytest")
    available = fw_result.get("available_frameworks", [default_fw])
    print(f"  Available frameworks: {', '.join(available)}")
    framework = input(f"Framework? [{default_fw}]: ").strip() or default_fw

    print(f"\n  Calling MCP: generate_unit_tests ({language} / {framework}) …")
    result = mcp.generate_unit_tests(code=code, language=language, framework=framework)

    if not result.get("success"):
        print(f"  Error: {result.get('error')}")
        return

    ext = fw_result.get("extension", ".py")
    slug = _slugify(input("Short name for the test file [generated]: ").strip() or "generated")
    output_path = Path(CONFIG.outputs.tests_dir) / f"{slug}{ext}"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result["content"], encoding="utf-8")
    print(f"\n  Tests saved → {output_path}  (framework: {framework})")


def handle_explain():
    _banner("Code Explainer")

    code = _read_code_from_user()
    if not code:
        return

    

    print("\n  Calling MCP: explain_code …")
    mcp = get_mcp_client()
    result = mcp.explain_code(code=code, detail_level="high")

    if not result.get("success"):
        print(f"  Error: {result.get('error')}")
        return

    slug = _slugify(input("Output file name [explanation]: ").strip() or "explanation")
    output_path = Path(CONFIG.outputs.explanations_dir) / f"{slug}.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(result["explanation"], encoding="utf-8")
    print(f"\n  Explanation saved → {output_path}")


# ── Menu ──────────────────────────────────────────────────────────────────────

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
    print("  Welcome to Your AI Dev Assistant  (MCP-powered)")
    print(SEPARATOR)

    print("\n  Connecting to MCP server …")
    try:
        mcp = get_mcp_client()
        tools = mcp.list_tools()
        tool_names = [t["name"] for t in tools.get("tools", [])]
        print(f"  MCP server ready — {len(tool_names)} tools: {', '.join(tool_names)}\n")
    except Exception as e:
        print(f"  Warning: could not connect to MCP server: {e}\n")

    while True:
        print(_MENU)
        choice = input("> ").strip().lower()

        if choice in ("q", "quit", "exit"):
            print("\n  Goodbye!")
            break

        handler = _HANDLERS.get(choice)
        if handler is None:
            print("  Invalid choice. Please enter 1, 2, 3, 4, or q.")
            continue

        try:
            handler()
        except KeyboardInterrupt:
            print("\n\n  Interrupted. Returning to menu …")
        except Exception as e:
            print(f"  Something went wrong: {e}")
            if CONFIG.debug:
                import traceback; traceback.print_exc()

        input("\nPress Enter to continue …")


if __name__ == "__main__":
    main()