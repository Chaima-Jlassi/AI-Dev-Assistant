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
