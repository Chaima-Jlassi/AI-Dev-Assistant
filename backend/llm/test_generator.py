"""
Test-case generator.
The LLM detects the language from the code and picks the right framework.
"""
import re
from pathlib import Path
from typing import Optional, Tuple
from logger import logger
from errors import OllamaError
from llm.ollama_client import get_client


# Mapping from framework names the LLM might return → file extensions
_FRAMEWORK_EXTENSION = {
    "pytest":       ".py",
    "unittest":     ".py",
    "jest":         ".test.js",
    "mocha":        ".test.js",
    "jasmine":      ".spec.js",
    "vitest":       ".test.ts",
    "junit":        "Test.java",
    "testng":       "Test.java",
    "googletest":   "_test.cpp",
    "catch2":       "_test.cpp",
    "nunit":        "Tests.cs",
    "xunit":        "Tests.cs",
    "phpunit":      "Test.php",
    "rspec":        "_spec.rb",
    "go test":      "_test.go",
    "gotest":       "_test.go",
    "cargo test":   "_test.rs",
    "rust":         "_test.rs",
}


_DETECT_PROMPT = """\
Look at the following source code and answer with ONLY a JSON object — no extra text.

{{
  "language": "<detected programming language>",
  "framework": "<best unit-test framework for that language>",
  "extension": "<file extension for the test file, e.g. .py or Test.java>"
}}

Choose the framework from this list based on language:
- Python        → pytest
- JavaScript    → jest
- TypeScript    → jest  (or vitest)
- Java          → JUnit
- C++           → GoogleTest
- C#            → NUnit
- PHP           → PHPUnit
- Ruby          → RSpec
- Go            → go test
- Rust          → cargo test

SOURCE CODE:
{code}
"""


_TEST_PROMPT = """\
You are an expert software tester.

Generate comprehensive unit tests for the source code below using {framework}.

REQUIREMENTS:
1. Cover every public function / method / class found in the code.
2. Include: happy-path tests, edge cases, and error/exception cases.
3. Use proper {framework} conventions (fixtures, setup/teardown, assertions, mocks where needed).
4. Add a short docstring / comment to each test explaining what it verifies.
5. Output ONLY the test file content — no explanations, no markdown fences.

SOURCE CODE:
{code}
"""


def _detect_framework(code: str) -> Tuple[str, str, str]:
    """
    Ask the LLM to detect language + framework.
    Returns (language, framework, extension).
    Fallback to pytest / .py if detection fails.
    """
    import json
    client = get_client()
    prompt = _DETECT_PROMPT.format(code=code[:3000])  # only first 3 k chars needed
    try:
        raw = client.call(prompt, temperature=0.0)
        # strip any stray markdown
        raw = re.sub(r"```[a-z]*", "", raw).replace("```", "").strip()
        data = json.loads(raw)
        lang      = data.get("language", "Python")
        framework = data.get("framework", "pytest")
        ext       = data.get("extension", ".py")
        logger.info(f"Detected → language={lang}, framework={framework}, ext={ext}")
        return lang, framework, ext
    except Exception as e:
        logger.warning(f"Framework detection failed ({e}), falling back to pytest")
        return "Python", "pytest", ".py"


def generate_tests(code: str, output_name: str = None) -> Optional[str]:
    """
    Generate test cases for the given source code.

    Args:
        code:        Raw source code.
        output_name: Override output filename (auto-generated if None).

    Returns:
        Absolute path to the saved test file, or None on failure.
    """
    from config import CONFIG

    logger.info("Detecting language and test framework …")
    lang, framework, ext = _detect_framework(code)

    client = get_client()
    prompt = _TEST_PROMPT.format(framework=framework, code=code)

    logger.info(f"Generating {framework} tests …")
    try:
        response = client.call(prompt, temperature=0.2)
    except OllamaError as e:
        logger.error(f"Test generation failed: {e}")
        return None

    # Clean up any accidental markdown fences the model may emit
    response = re.sub(r"^```[a-z]*\n?", "", response, flags=re.MULTILINE)
    response = re.sub(r"^```\n?", "", response, flags=re.MULTILINE)

    if output_name is None:
        output_name = f"test_generated{ext}"

    out_path = Path(CONFIG.outputs.tests_dir) / output_name
    try:
        out_path.write_text(response, encoding="utf-8")
        logger.info(f"Tests saved → {out_path}  (framework: {framework})")
        return str(out_path.absolute())
    except Exception as e:
        logger.error(f"Failed to save test file: {e}")
        return None
