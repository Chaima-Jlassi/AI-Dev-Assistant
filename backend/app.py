from llm.ollama_client import generate_plantuml
from rag.retriever import retrieve_context
from mcp.tools import render_plantuml


def pipeline(user_input: str):
    print(" Retrieving context...")
    context = retrieve_context(user_input)
    print("Context:\n", context)

    print("\n Generating UML...")
    uml_code = generate_plantuml(user_input, context)

    # Debug: show exact output
    print("\n Generated UML (raw):\n", repr(uml_code))

    # Validate UML strictly
    if not uml_code or "@startuml" not in uml_code or "@enduml" not in uml_code:
        print(" Invalid UML generated")
        return None

    print("\n Rendering diagram...")

    image_path = render_plantuml(uml_code)

    if image_path is None:
        print(" Failed to render diagram")
    else:
        print(" Diagram saved at:", image_path)

    return image_path


if __name__ == "__main__":
    user_input = input("Enter your request: ")
    result = pipeline(user_input)

    print("\nFinal Output:", result)