# PCD-FOC — AI Dev Assistant

A local-first AI developer tool powered by **Ollama** (LLM) + **RAG** + **PlantUML**.

One persistent Ollama session handles all four features without reconnecting.

---

## Features

| # | Feature | Output folder |
|---|---------|--------------|
| 1 | 🖼️ Generate UML diagrams from natural language | `outputs/diagrams/` |
| 2 | 📄 Generate README from source code | `outputs/readme/` |
| 3 | 🧪 Generate test cases (framework auto-detected by LLM) | `outputs/tests/` |
| 4 | 💡 Explain code in plain English | `outputs/explanations/` |

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

```bash
# 1. Clone / copy the project
cd pcd_foc

# 2. Create a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start Ollama in another terminal
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

## Configuration

All settings can be overridden with environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama endpoint |
| `OLLAMA_MODEL` | `mistral` | Model to use |
| `OLLAMA_TIMEOUT` | `180` | Request timeout (seconds) |
| `OLLAMA_TEMPERATURE` | `0.3` | Generation temperature |
| `PLANTUML_URL` | plantuml.com | PlantUML render server |
| `PLANTUML_LOCAL` | `false` | Use local jar instead |
| `RAG_TOP_K` | `2` | Examples retrieved per query |
| `OUTPUT_README_DIR` | `./outputs/readme` | README output folder |
| `OUTPUT_TESTS_DIR` | `./outputs/tests` | Tests output folder |
| `OUTPUT_EXPLANATIONS_DIR` | `./outputs/explanations` | Explanations output folder |
| `DEBUG` | `false` | Print full tracebacks |

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
