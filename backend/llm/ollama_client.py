import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "mistral"

def call_ollama(prompt: str) -> str:
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        }
    )
    # Safety check
    data = response.json()
    if "response" not in data:
        print(" Ollama response invalid:", data)
        return ""
    return data["response"].strip()


def generate_plantuml(user_input: str, context: str) -> str:
    prompt = f"""
You are an expert in UML and PlantUML.

Use the context below to generate a correct UML diagram.

Context:
{context}

Rules:
- Only return valid PlantUML code
- No explanations
- No extra text or markdown
- Must start with @startuml
- Must end with @enduml

User request:
{user_input}
"""

    uml_output = call_ollama(prompt)

    # Extract UML if extra text sneaks in
    start = uml_output.find("@startuml")
    end = uml_output.find("@enduml") + len("@enduml")
    if start == -1 or end == -1:
        print(" Ollama did not return valid UML.")
        return ""
    
    clean_uml = uml_output[start:end].strip()
    return clean_uml