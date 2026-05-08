"""
DeepSeek/OpenRouter Prompt Engineering Templates
================================================
Production-grade prompts for README generation, architecture recommendations,
and UML diagram description — optimized for OpenRouter (gpt-3.5-turbo).

Usage:
    from gemini_prompts import GeminiPromptEngine
    engine = GeminiPromptEngine(api_key="YOUR_KEY")
    result = engine.generate_readme(code=..., project_name=..., language=...)
"""

from openai import OpenAI
from enum import Enum


# ─────────────────────────────────────────────
# SYSTEM PROMPTS
# ─────────────────────────────────────────────

README_SYSTEM_PROMPT = """
You are a senior software engineer and technical writer with 15+ years of experience.
Your specialty is writing clear, professional, and developer-friendly documentation.

RULES:
- Write in clean, valid Markdown only — no HTML, no extra commentary outside the document.
- Be specific and concrete. Avoid filler phrases like "robust solution" or "cutting-edge technology".
- If context is ambiguous, state your assumption explicitly with a note: > ⚠️ Assumption: ...
- Keep sentences short. Use active voice.
- Never invent features or capabilities that are not clearly present in the input.
- Use real-world examples in code blocks when relevant.
- Badge shields (if used) must use shields.io format.

OUTPUT FORMAT:
Return only the README.md content. No preamble, no explanation, no closing remarks.
""".strip()


ARCHITECTURE_SYSTEM_PROMPT = """
You are a principal software architect with deep expertise in system design,
distributed systems, cloud-native patterns, and software engineering best practices.

Your analysis style:
- Uses C4 model terminology (Context, Container, Component, Code).
- References well-known patterns by name (CQRS, Event Sourcing, Hexagonal Architecture, etc.).
- Is opinionated and direct — you say what you think, not just what is possible.
- Balances trade-offs honestly: every recommendation has a cost you must acknowledge.
- Distinguishes between "must fix now", "should improve soon", and "nice to have".

RULES:
- Output in clean Markdown.
- Use headers, bullet points, and tables where appropriate.
- Do not hallucinate frameworks or libraries not present in the input.
- Always ground recommendations in the context provided.
- If the input is incomplete, state what additional context would change your analysis.

OUTPUT FORMAT:
Return only the architecture analysis document. No preamble, no closing remarks.
""".strip()


UML_SYSTEM_PROMPT = """
You are a software architect who specializes in translating codebases into precise
PlantUML diagram descriptions.

Your PlantUML output:
- Is always valid, executable PlantUML syntax.
- Uses skinparam for clean, professional styling.
- Chooses the right diagram type automatically:
    * Class relationships → Class Diagram
    * Request flows / processes → Sequence Diagram
    * System states → State Diagram
    * Deployment / infrastructure → Deployment Diagram
    * Use cases → Use Case Diagram
- Includes only what is architecturally significant — not every getter/setter.
- Groups related components using packages or namespaces.

RULES:
- Output ONLY the PlantUML block (starting with @startuml, ending with @enduml).
- No explanation before or after.
- Comments inside the diagram (') are allowed for clarity.
- Use !theme materia or !theme cerulean for clean visuals.
""".strip()


# ─────────────────────────────────────────────
# USER PROMPT TEMPLATES
# ─────────────────────────────────────────────

def build_readme_prompt(
    code: str = "",
    project_name: str = "",
    language: str = "",
    description: str = "",
    features: list[str] = None,
    extra_context: str = ""
) -> str:
    """Builds a structured user prompt for README generation."""
    features_block = ""
    if features:
        features_block = "KNOWN FEATURES:\n" + "\n".join(f"- {f}" for f in features)

    return f"""
Generate a complete, professional README.md for the following project.

PROJECT NAME: {project_name or "Infer from code"}
PRIMARY LANGUAGE / STACK: {language or "Infer from code"}
SHORT DESCRIPTION: {description or "Infer from code"}

{features_block}

SOURCE CODE / FILE STRUCTURE:
```
{code or "Not provided — infer from description and context above."}
```

{f"ADDITIONAL CONTEXT: {extra_context}" if extra_context else ""}

REQUIRED SECTIONS: Include all sections in the standard README format.
TONE: Professional, concise, developer-first. No marketing language.
""".strip()


def build_architecture_prompt(
    code: str = "",
    project_name: str = "",
    language: str = "",
    description: str = "",
    concerns: list[str] = None,
    extra_context: str = ""
) -> str:
    """Builds a structured user prompt for architecture analysis."""
    concerns_block = ""
    if concerns:
        concerns_block = "SPECIFIC CONCERNS TO ADDRESS:\n" + "\n".join(f"- {c}" for c in concerns)

    return f"""
Perform a complete architecture analysis for the following project and provide
actionable recommendations.

PROJECT NAME: {project_name or "Unknown"}
PRIMARY STACK: {language or "Infer from code"}
DESCRIPTION: {description or "Infer from code"}

{concerns_block}

SOURCE CODE / STRUCTURE / DESCRIPTION:
```
{code or "Not provided — base analysis on description and stack above."}
```

{f"ADDITIONAL CONTEXT: {extra_context}" if extra_context else ""}

REQUIRED SECTIONS: Architecture summary, strengths, weaknesses, recommendations, scalability assessment, security considerations, quick wins.
TONE: Direct, opinionated, senior-level. Avoid vague advice. Be specific.
""".strip()


def build_uml_prompt(
    code: str = "",
    diagram_type: str = "auto",
    project_name: str = "",
    scope: str = "full",
    extra_context: str = ""
) -> str:
    """Builds a structured user prompt for PlantUML diagram generation."""
    type_instruction = {
        "auto":       "Choose the most appropriate diagram type based on the code provided.",
        "class":      "Generate a Class Diagram showing relationships, inheritance, and key attributes.",
        "sequence":   "Generate a Sequence Diagram showing the main request/response or event flow.",
        "state":      "Generate a State Diagram showing the lifecycle of the main entity.",
        "deployment": "Generate a Deployment Diagram showing infrastructure and service relationships.",
        "usecase":    "Generate a Use Case Diagram showing actors and system interactions.",
    }.get(diagram_type, "Choose the most appropriate diagram type.")

    scope_instruction = (
        "Include ALL components, classes, and relationships visible in the code."
        if scope == "full"
        else "Focus only on the CORE flow and main architectural components. Omit helpers and utilities."
    )

    return f"""
Generate a PlantUML diagram for the following project.

PROJECT NAME: {project_name or "Project"}
DIAGRAM TYPE: {type_instruction}
SCOPE: {scope_instruction}

SOURCE CODE:
```
{code or "Not provided — generate based on description and context."}
```

{f"ADDITIONAL CONTEXT / ENTRY POINTS: {extra_context}" if extra_context else ""}

REQUIREMENTS:
- Output ONLY the PlantUML code block
- Use valid PlantUML syntax
- Keep the diagram readable — if too complex, focus on the most important layer
""".strip()


# ─────────────────────────────────────────────
# ENGINE CLASS
# ─────────────────────────────────────────────

class GeminiPromptEngine:
    """
    Main engine for generating technical documentation using OpenRouter API.

    Example:
        engine = GeminiPromptEngine(api_key="YOUR_KEY")
        readme = engine.generate_readme(code=src, project_name="MyApp", language="Python")
        arch   = engine.generate_architecture(code=src, concerns=["scalability"])
        uml    = engine.generate_uml(code=src, diagram_type="sequence")
    """

    MODEL = "llama-3.3-70b-versatile"  # Available on Groq free tier

    def __init__(self, api_key: str):
        # Keep the OpenAI client if available, but also store raw API details for a requests-based fallback.
        self.api_key = api_key
        self.base_url = "https://api.groq.com/openai/v1"
        try:
            self.client = OpenAI(api_key=api_key, base_url=self.base_url)
        except Exception:
            self.client = None

    def _get_response(self, system_prompt: str, user_prompt: str) -> str:
        # First try using the OpenAI client (if present); fall back to a direct requests call that sets
        # Authorization header explicitly (avoids client-specific auth edge cases).
        payload = {
            "model": self.MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 8192,
        }
        # Try OpenAI client
        if getattr(self, "client", None) is not None:
            try:
                response = self.client.chat.completions.create(**payload)
                # Some OpenAI SDKs return different shapes; be defensive
                if hasattr(response, 'choices') and response.choices:
                    choice = response.choices[0]
                    # new SDK shape
                    if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
                        return choice.message.content
                    # fallback
                    return getattr(choice, 'text', str(choice))
            except Exception:
                # fall through to requests-based call
                pass

        # Direct HTTP fallback (OpenRouter-compatible endpoint)
        import requests
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        }
        url = f"{self.base_url}/chat/completions"
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        # parse response defensively
        if isinstance(data, dict):
            # OpenRouter returns { 'choices': [ { 'message': { 'content': '...' } } ] }
            choices = data.get('choices') or []
            if choices:
                msg = choices[0].get('message') or choices[0]
                if isinstance(msg, dict):
                    return msg.get('content') or msg.get('text') or ''
        return str(data)

    def generate_readme(self, **kwargs) -> str:
        """Generate a README.md. Accepts all build_readme_prompt() kwargs."""
        prompt = build_readme_prompt(**kwargs)
        return self._get_response(README_SYSTEM_PROMPT, prompt)

    def generate_architecture(self, **kwargs) -> str:
        """Generate an architecture analysis. Accepts all build_architecture_prompt() kwargs."""
        prompt = build_architecture_prompt(**kwargs)
        return self._get_response(ARCHITECTURE_SYSTEM_PROMPT, prompt)

    def generate_uml(self, **kwargs) -> str:
        """Generate PlantUML code. Accepts all build_uml_prompt() kwargs."""
        prompt = build_uml_prompt(**kwargs)
        return self._get_response(UML_SYSTEM_PROMPT, prompt)

    def generate_tests(self, code: str = "", language: str = "auto") -> str:
        """Generate unit tests for the given code."""
        system_prompt = """You are an expert software testing engineer. Generate comprehensive, 
        production-ready unit tests. Output only the test code with no explanation."""
        user_prompt = f"Generate unit tests for the following {language} code:\n\n{code}"
        return self._get_response(system_prompt, user_prompt)

    def generate_explanation(self, code: str = "", language: str = "auto", detail_level: str = "standard") -> str:
        """Generate a detailed explanation of code."""
        detail_instruction = {
            "brief": "Provide a concise one-paragraph explanation.",
            "standard": "Provide a clear, medium-length explanation with key concepts.",
            "detailed": "Provide a comprehensive explanation with examples and edge cases."
        }.get(detail_level, "Provide a clear explanation.")
        
        system_prompt = f"""You are a senior code mentor explaining code to developers. 
        {detail_instruction} Be clear and educational."""
        user_prompt = f"Explain this {language} code:\n\n{code}"
        return self._get_response(system_prompt, user_prompt)

    def generate_recommendation(self, code: str = "", project_name: str = "", language: str = "auto", description: str = "") -> str:
        """Generate architectural or code improvement recommendations."""
        system_prompt = """You are a principal software architect. Provide practical, 
        actionable recommendations with clear trade-offs and rationale. Be concise and direct."""
        user_prompt = f"""Project: {project_name or 'Unknown'}
Language: {language}

{description or 'Provide recommendations for this code:'}

{code}"""
        return self._get_response(system_prompt, user_prompt)

    def generate_other(self, question: str = "", context: str = "", extra_context: str = "") -> str:
        """Generate general guidance for open-ended questions."""
        system_prompt = """You are a helpful software engineering expert. Provide practical, 
        well-reasoned guidance. Be concise and direct."""
        full_context = "\n\n".join(filter(None, [context, extra_context]))
        user_prompt = f"""{question}

{f'Context: {full_context}' if full_context else ''}"""
        return self._get_response(system_prompt, user_prompt)
