"""Gemini prompt helpers for architecture/recommendation/other outputs."""

from __future__ import annotations

import google.generativeai as genai


README_SYSTEM_PROMPT = """
You are a senior software engineer and technical writer.
Write a professional README in clean Markdown only.
Do not invent features not supported by the input.
""".strip()

ARCHITECTURE_SYSTEM_PROMPT = """
You are a principal software architect.
Write a concise but useful architecture analysis in clean Markdown only.
Be direct, specific, and practical.
""".strip()

RECOMMENDATION_SYSTEM_PROMPT = """
You are a senior software architect and advisor.
Give practical recommendations, trade-offs, and next steps in clean Markdown only.
""".strip()

OTHER_SYSTEM_PROMPT = """
You are a senior software engineer assistant.
Answer coding and software engineering questions clearly and practically in clean Markdown only.
If critical context is missing, ask concise follow-up questions first.
""".strip()

UML_SYSTEM_PROMPT = """
You are a software architect who writes valid PlantUML only.
Return only an @startuml ... @enduml block.
""".strip()

EXPLANATION_SYSTEM_PROMPT = """
You are a senior software engineer who explains code clearly and precisely.
Write clean Markdown only. Use headers, bullet points, and inline code blocks where appropriate.
Tailor depth to the requested detail level.
Never hallucinate behavior not visible in the code.
""".strip()

TEST_SYSTEM_PROMPT = """
You are a senior software engineer who writes thorough, production-quality unit tests.
Output a single fenced code block containing the full test file.
Use the idiomatic test framework for the detected language (pytest for Python, Jest for JS/TS, JUnit for Java, etc.).
Include: happy path, edge cases, boundary values, error/exception cases.
Do not invent behavior not shown in the source.
""".strip()


def build_readme_prompt(*, code: str = "", project_name: str = "", language: str = "", description: str = "", extra_context: str = "") -> str:
    return f"""Generate a complete README.md for this project.

Project name: {project_name or "Infer from code"}
Language/stack: {language or "Infer from code"}
Description: {description or "Infer from code"}

Additional context:
{extra_context or "None"}

Source:
````
{code or "Not provided"}
````
"""


def build_architecture_prompt(*, code: str = "", project_name: str = "", language: str = "", description: str = "", concerns: list[str] | None = None, extra_context: str = "") -> str:
    concerns_block = "\n".join(f"- {item}" for item in (concerns or [])) or "- None"
    return f"""Analyze the architecture of this project and provide recommendations.

Project name: {project_name or "Unknown"}
Stack: {language or "Infer from code"}
Description: {description or "Infer from code"}
Concerns:
{concerns_block}

Additional context:
{extra_context or "None"}

Source:
````
{code or "Not provided"}
````
"""


def build_recommendation_prompt(*, code: str = "", project_name: str = "", language: str = "", description: str = "", concerns: list[str] | None = None, extra_context: str = "") -> str:
    concerns_block = "\n".join(f"- {item}" for item in (concerns or [])) or "- None"
    return f"""Give practical recommendations for this project.

Project name: {project_name or "Unknown"}
Stack: {language or "Infer from code"}
Description: {description or "Infer from code"}
Concerns:
{concerns_block}

Additional context:
{extra_context or "None"}

Source:
````
{code or "Not provided"}
````
"""


def build_other_prompt(*, question: str = "", context: str = "", extra_context: str = "") -> str:
    return f"""Answer this software engineering question.

Question:
{question or "Not provided"}

Conversation context:
{context or "None"}

Additional context:
{extra_context or "None"}
"""


def build_uml_prompt(*, code: str = "", diagram_type: str = "auto", project_name: str = "", scope: str = "full", extra_context: str = "") -> str:
    return f"""Generate PlantUML for this project.

Diagram type: {diagram_type}
Scope: {scope}
Project name: {project_name or "Project"}

Additional context:
{extra_context or "None"}

Source:
````
{code or "Not provided"}
````
"""


def build_explanation_prompt(*, code: str = "", language: str = "", detail_level: str = "standard") -> str:
    level_map = {
        "brief": "2-4 sentence summary: what it does and its primary purpose.",
        "standard": "What it does, how it works step-by-step, key functions/classes, and important patterns.",
        "detailed": "Thorough: purpose, step-by-step mechanics, design patterns, edge cases, gotchas, and improvement suggestions.",
    }
    instruction = level_map.get(detail_level, level_map["standard"])
    return f"""Explain the following code.

Language: {language or "Detect from code"}
Detail level: {detail_level}
Instruction: {instruction}

Code:
````
{code or "Not provided"}
````
"""


def build_tests_prompt(*, code: str = "", language: str = "") -> str:
    return f"""Generate comprehensive unit tests for the following code.

Language: {language or "Detect from code"}
Use the idiomatic test framework for the detected language.

Source code:
````
{code or "Not provided"}
````

Requirements:
- Cover happy path, edge cases, boundary values, and error/exception scenarios
- Output a single complete, runnable test file in a fenced code block
- Do not invent functions or behavior not present in the source
"""


class GeminiPromptEngine:
    MODEL = "gemini-2.0-flash"
    GENERATION_CONFIG = {
        "temperature": 0.3,
        "top_p": 0.9,
        "top_k": 40,
        "max_output_tokens": 8192,
    }

    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)

    def _model(self, system_prompt: str):
        return genai.GenerativeModel(
            model_name=self.MODEL,
            system_instruction=system_prompt,
            generation_config=self.GENERATION_CONFIG,
        )

    def generate_readme(self, **kwargs) -> str:
        return self._model(README_SYSTEM_PROMPT).generate_content(build_readme_prompt(**kwargs)).text

    def generate_architecture(self, **kwargs) -> str:
        return self._model(ARCHITECTURE_SYSTEM_PROMPT).generate_content(build_architecture_prompt(**kwargs)).text

    def generate_recommendation(self, **kwargs) -> str:
        return self._model(RECOMMENDATION_SYSTEM_PROMPT).generate_content(build_recommendation_prompt(**kwargs)).text

    def generate_uml(self, **kwargs) -> str:
        return self._model(UML_SYSTEM_PROMPT).generate_content(build_uml_prompt(**kwargs)).text

    def generate_other(self, **kwargs) -> str:
        return self._model(OTHER_SYSTEM_PROMPT).generate_content(build_other_prompt(**kwargs)).text

    def generate_explanation(self, **kwargs) -> str:
        return self._model(EXPLANATION_SYSTEM_PROMPT).generate_content(build_explanation_prompt(**kwargs)).text

    def generate_tests(self, **kwargs) -> str:
        return self._model(TEST_SYSTEM_PROMPT).generate_content(build_tests_prompt(**kwargs)).text
