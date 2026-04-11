# PCD-FOC — AI Dev Assistant

A local-first AI developer tool powered by **Ollama** (LLM) + **RAG** + **PlantUML**.

One persistent Ollama session handles all four features without reconnecting.

---

## Features

| # | Feature | Output folder |
| 1 | Generate UML diagrams from natural language | `outputs/diagrams/` |
| 2 | Generate README from source code | `outputs/readme/` |
| 3 | Generate test cases (framework auto-detected by LLM) | `outputs/tests/` |
| 4 | Explain code in plain English | `outputs/explanations/` |

### Auto-detected test frameworks

| Language | Framework |
|----------|-----------|
| Python | pytest |
| JavaScript | Jest |
| TypeScript | Jest / Vitest |
| Java | JUnit |
| C++ | GoogleTest |
| C# | NUnit |
| PHP | PHPUnit |
| Ruby | RSpec |
| Go | go test |
| Rust | cargo test |

---

## Project Structure

```
pcd_foc/
├── app.py                  ← Main CLI entry point
├── config.py               ← All configuration (env-var driven)
├── logger.py               ← Logging setup
├── errors.py               ← Custom exceptions + helpers
├── requirements.txt
│
├── llm/
│   ├── ollama_client.py    ← Persistent session client (singleton)
│   ├── uml_generator.py    ← UML diagram feature
│   ├── readme_generator.py ← README feature
│   ├── test_generator.py   ← Test-case feature (LLM detects framework)
│   └── explainer.py        ← Code explanation feature
│
├── mcp/
│   └── tools_v2.py         ← PlantUML renderer (online + local jar)
│
├── rag/
│   └── retriever_v2.py     ← FAISS-based RAG retriever for UML examples
│
├── data/
│   └── uml_examples_v2.py  ← Curated PlantUML example corpus
│
└── outputs/
    ├── diagrams/           ← Generated PNG diagrams
    ├── readme/             ← Generated README.md files
    ├── tests/              ← Generated test files
    └── explanations/       ← Generated explanation.md files
```

---

## Requirements

- Python 3.9+
- [Ollama](https://ollama.com) running locally (`ollama serve`)
- A pulled model, e.g. `ollama pull mistral`
- Java (optional, for local PlantUML rendering)

---

## Installation
Install dependencies
pip install -r requirements.txt

# . Start Ollama in another terminal
ollama serve
ollama pull mistral          # or any other model
```

---

## Usage

```bash
python app.py
```

The CLI will:
1. Connect to Ollama **once** and keep the session alive
2. Show a menu — choose a feature
3. Provide code by pasting or giving a file path
4. Find the output in the matching `outputs/` subfolder

---



## Architecture

```
User Input
    │
    ▼
app.py (menu)
    │
    ├─► llm/ollama_client.py  ◄── singleton, one TCP session
    │         │
    │    ┌────┴──────────────────────────┐
    │    │                               │
    │  feature prompts               RAG context
    │    │                               │
    │    ▼                               ▼
    │  Ollama LLM ◄──────────── rag/retriever_v2.py
    │    │                       (FAISS + embeddings)
    │    ▼
    │  parsed output
    │    │
    │    ├─► mcp/tools_v2.py  → PNG (diagrams)
    │    ├─► outputs/readme/  → .md
    │    ├─► outputs/tests/   → test file
    │    └─► outputs/explanations/ → .md
```
