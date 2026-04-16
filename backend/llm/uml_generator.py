"""PlantUML generator — moved here from ollama_client_v2 for cleaner separation."""
from typing import List, Optional

from llm.ollama_client import get_client


_PROMPT_TEMPLATE = """\
You are an expert in UML and PlantUML diagram syntax.

IMPORTANT RULES:
1. Return ONLY valid PlantUML code — no explanations, no markdown, no extra text.
2. EACH diagram MUST start with @startuml and end with @enduml.
3. Use proper PlantUML syntax.
4. Generate clear, well-structured diagrams.
5. Separate multiple diagrams with a blank line.

EXAMPLES:
@startuml
participant User
participant System
participant DB
User -> System: Login request
System -> DB: Check credentials
DB --> System: User found
System --> User: Login successful
@enduml

@startuml
class User {{
  -id: int
  -name: String
  +login(): boolean
}}
class System {{
  +authenticate(user): boolean
}}
User --> System
@enduml

CONTEXT FROM EXAMPLES:
{context}

USER REQUEST:
{user_input}

Generate exactly {count} PlantUML diagram(s).
"""


def extract_uml_codes(response: str) -> List[str]:
    """
    Extract valid PlantUML code blocks from the response.

    Returns:
        List of extracted UML code strings (between @startuml and @enduml).
    """
    blocks = []
    lines = response.split('\n')
    current_block = []
    in_block = False

    for line in lines:
        if '@startuml' in line:
            in_block = True
            current_block = [line]
        elif '@enduml' in line:
            current_block.append(line)
            blocks.append('\n'.join(current_block))
            in_block = False
            current_block = []
        elif in_block:
            current_block.append(line)

    return blocks


def generate_plantuml(
    user_input: str,
    context: str,
    count: int = 1,
) -> Optional[List[str]]:
    """
    Generate PlantUML diagram(s) from a natural-language request.

    Uses the session-wide OllamaClient (no new connection created).

    Returns:
        List of valid UML code strings, or None if generation failed.
    """
    client = get_client()
    prompt = _PROMPT_TEMPLATE.format(
        context=context,
        user_input=user_input,
        count=count,
    )
    try:
        response = client.call(prompt)
        blocks = extract_uml_codes(response)
        if not blocks:
            print("  No valid UML blocks extracted from response")
            return None
        if len(blocks) < count:
            print(f"  Requested {count}, got {len(blocks)} valid block(s)")
        print(f"  Extracted {len(blocks)} UML block(s)")
        return blocks
    except:
        print("  UML generation failed.")
        raise
