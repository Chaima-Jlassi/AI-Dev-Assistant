# Running the Python Backend

Yes — for this project, you create a virtual environment, install dependencies, then run `app.py`.

## Steps (Windows / PowerShell)

1. Open a terminal at the project root:
   ```powershell
   cd C:\Users\oussa\AI-Dev-Assistant\backend
   ```

2. Create a virtual environment:
   ```powershell
   python -m venv .venv
   ```

3. Activate it:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

4. Install dependencies:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. Run the app:
   ```powershell
   python app.py
   ```

## Important note

This backend calls Ollama at `http://localhost:11434/api/generate` by default, so make sure Ollama is installed and running before using the assistant features.
