// src/llm.ts
export async function callLLM(prompt: string): Promise<string> {
  try {
    const controller = new AbortController();
    // Increase timeout to 2 minutes for slow hardware
    const timeout = setTimeout(() => controller.abort(), 120000); 

    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tinyllama', // Much faster for testing
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 200, // Keep response short to save time
          temperature: 0.3  // Lower temp is faster/more stable
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return `Ollama Error: ${response.statusText}`;
    }

    const data: any = await response.json();
    return data.response || "No response generated.";
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return "The AI is taking too long. Please ensure no other heavy apps are open.";
    }
    return `Connection Error: ${error.message}`;
  }
}