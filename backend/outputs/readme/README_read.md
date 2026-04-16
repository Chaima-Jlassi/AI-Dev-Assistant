# Project Title
Code Explainer

## Overview
This project provides a function that generates a structured, human-readable explanation of source code. The explanation is produced using an LLM (Large Language Model) and covers various sections such as what the code does, key components, execution flow, design patterns, potential issues, and glossary.

## Features
- Generates explanations for source code in Markdown format.
- Utilizes a Large Language Model (LLM) to provide clear, concise explanations.
- Allows customizing the output file name.

## Project Structure
The project consists of three main files:

1. `explain_code.py` - The entry point and main function for generating code explanations.
2. `logger.py` - Handles logging messages and exceptions.
3. `errors.py` - Defines custom exceptions for handling errors during explanation generation.
4. `config.py` - Contains configuration settings such as the directory to save generated explanations.
5. `llm/ollama_client.py` - Interface for interacting with the Large Language Model service (not part of this project).

## Requirements
- python3
- llm package for accessing the Large Language Model service

## Installation
To install dependencies, run:
```bash
pip install llm
```

## Usage
You can use `explain_code.py` to generate explanations by providing source code as a string argument and an optional output file name. By default, the output will be saved under `outputs/explanations/`. Here's an example:
```bash
python explain_code.py "Your source code here" explanation.md
```

## Configuration
The configuration settings can be found in `config.py`. Change the directory where generated explanations are saved by modifying the `outputs.explanations_dir` variable.

## Architecture
The program uses a single function, `explain_code()`, to generate code explanations using the Large Language Model service via `ollama_client.py`. The explanation is produced based on the provided prompt and saved under the specified output file name.

## License
This project is released under the MIT License by default. However, since it heavily relies on external packages (e.g., llm), you should consult their respective licenses for proper attribution.