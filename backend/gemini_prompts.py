"""
Gemini Prompt Engineering Templates
====================================
Production-grade prompts for README generation, architecture recommendations,
and UML diagram description — optimized for gemini-2.0-flash.

Usage:
    from gemini_prompts import GeminiPromptEngine
    engine = GeminiPromptEngine(api_key="YOUR_KEY")
    result = engine.generate_readme(code=..., project_name=..., language=...)
"""

import google.generativeai as genai


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
    """
    Builds a structured user prompt for README generation.

    Args:
        code:           Raw source code or file tree (can be partial).
        project_name:   Name of the project.
        language:       Primary language/framework (e.g. "Python / FastAPI").
        description:    One-line project description if known.
        features:       Optional list of known features.
        extra_context:  Any additional context (license, audience, etc.).
    """
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

REQUIRED SECTIONS (include all that are relevant):
1. # Project Title  
   - One-line tagline below the title
   - Badges (build status, license, language version) — use shields.io

2. ## Overview  
   - What the project does and why it exists (2–4 sentences)
   - Who it is for

3. ## Tech Stack  
   - Table or bullet list: technology | version | purpose

4. ## Features  
   - Bulleted list of key capabilities

5. ## Prerequisites  
   - System requirements
   - Required tools and their minimum versions

6. ## Installation  
   - Step-by-step with code blocks
   - Include environment variable setup if applicable

7. ## Usage  
   - At least one real, runnable example with expected output
   - CLI flags or API endpoints if applicable

8. ## Project Structure  
   - Annotated directory tree (use backtick code block)

9. ## Architecture Overview  
   - 2–4 sentences describing the high-level design
   - Reference diagram if applicable

10. ## Contributing  
    - Fork → branch → PR workflow
    - Code style / linting requirements

11. ## License  
    - State license type clearly

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
    """
    Builds a structured user prompt for architecture analysis and recommendations.

    Args:
        code:           Source code, file tree, or architecture description.
        project_name:   Name of the project.
        language:       Primary stack.
        description:    Brief project description.
        concerns:       Specific concerns to focus on (e.g. ["scalability", "security"]).
        extra_context:  Team size, traffic volume, deployment target, etc.
    """
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

REQUIRED SECTIONS:

1. ## Architecture Summary
   - Identify the current architectural pattern (Monolith, Microservices, Layered, Hexagonal, etc.)
   - Describe the system in C4 Container-level terms
   - List the main technical components and how they interact

2. ## Strengths
   - What the current design does well
   - Be specific — reference actual code patterns if visible

3. ## Weaknesses & Risks
   - Prioritized list: 🔴 Critical | 🟡 Important | 🟢 Minor
   - For each: describe the problem, its impact, and an example if possible

4. ## Recommendations
   - For each weakness above, provide a concrete recommendation
   - Format: Problem → Recommendation → Trade-off
   - Reference design patterns by name where applicable

5. ## Scalability Assessment
   - Current bottlenecks
   - Horizontal vs vertical scaling suitability
   - Stateless vs stateful components

6. ## Security Considerations
   - Authentication / Authorization gaps
   - Data exposure risks
   - Dependency risks

7. ## Suggested Architecture (if major changes are warranted)
   - Describe the target architecture in plain language
   - Explain the migration path from current to target
   - Highlight what should NOT change

8. ## Quick Wins (implement in < 1 week)
   - 3–5 low-effort, high-impact improvements

TONE: Direct, opinionated, senior-level. Avoid vague advice. Be specific.
""".strip()


def build_uml_prompt(
    code: str = "",
    diagram_type: str = "auto",
    project_name: str = "",
    scope: str = "full",
    extra_context: str = ""
) -> str:
    """
    Builds a structured user prompt for PlantUML diagram generation.

    Args:
        code:           Source code to analyze.
        diagram_type:   "auto" | "class" | "sequence" | "state" | "deployment" | "usecase"
        project_name:   Project name for diagram title.
        scope:          "full" | "core" — full includes all components, core = main flow only.
        extra_context:  Entry points, key flows to highlight, etc.
    """
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
- Use !theme cerulean or !theme materia for clean styling
- Add a title using `title` keyword
- Group related elements using `package` or `namespace`
- Use notes (note) to explain non-obvious relationships
- Omit trivial getters/setters from class diagrams
- For sequence diagrams: show at least the happy path + one error path
- Keep the diagram readable — if too complex, focus on the most important layer

OUTPUT: Only the PlantUML code block. Nothing else.
""".strip()


# ─────────────────────────────────────────────
# ENGINE CLASS
# ─────────────────────────────────────────────

class GeminiPromptEngine:
    """
    Main engine for generating technical documentation using Gemini API.

    Example:
        engine = GeminiPromptEngine(api_key="YOUR_KEY")
        readme = engine.generate_readme(code=src, project_name="MyApp", language="Python")
        arch   = engine.generate_architecture(code=src, concerns=["scalability"])
        uml    = engine.generate_uml(code=src, diagram_type="sequence")
    """

    MODEL = "gemini-2.0-flash"

    GENERATION_CONFIG = {
        "temperature": 0.3,        # Lower = more consistent, structured output
        "top_p": 0.9,
        "top_k": 40,
        "max_output_tokens": 8192,
    }

    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)

    def _get_model(self, system_prompt: str):
        return genai.GenerativeModel(
            model_name=self.MODEL,
            system_instruction=system_prompt,
            generation_config=self.GENERATION_CONFIG,
        )

    def generate_readme(self, **kwargs) -> str:
        """Generate a README.md. Accepts all build_readme_prompt() kwargs."""
        model = self._get_model(README_SYSTEM_PROMPT)
        prompt = build_readme_prompt(**kwargs)
        response = model.generate_content(prompt)
        return response.text

    def generate_architecture(self, **kwargs) -> str:
        """Generate an architecture analysis. Accepts all build_architecture_prompt() kwargs."""
        model = self._get_model(ARCHITECTURE_SYSTEM_PROMPT)
        prompt = build_architecture_prompt(**kwargs)
        response = model.generate_content(prompt)
        return response.text

    def generate_uml(self, **kwargs) -> str:
        """Generate PlantUML code. Accepts all build_uml_prompt() kwargs."""
        model = self._get_model(UML_SYSTEM_PROMPT)
        prompt = build_uml_prompt(**kwargs)
        response = model.generate_content(prompt)
        return response.text


# ─────────────────────────────────────────────
# QUICK TEST
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import os

    engine = GeminiPromptEngine(api_key=os.getenv("GEMINI_API_KEY"))

    sample_code = """
    # app/main.py
    from fastapi import FastAPI
    from app.routers import users, projects
    from app.database import init_db

    app = FastAPI(title="DevDocs API")
    app.include_router(users.router)
    app.include_router(projects.router)

    @app.on_event("startup")
    async def startup():
        await init_db()
    """

    print("=== README ===")
    print(engine.generate_readme(
        code=sample_code,
        project_name="DevDocs API",
        language="Python / FastAPI",
        features=["Auto README generation", "Architecture analysis", "UML export"]
    ))

    print("\n=== ARCHITECTURE ===")
    print(engine.generate_architecture(
        code=sample_code,
        project_name="DevDocs API",
        concerns=["scalability", "security", "code organization"]
    ))

    print("\n=== UML ===")
    print(engine.generate_uml(
        code=sample_code,
        diagram_type="sequence",
        project_name="DevDocs API",
        scope="core"
    ))