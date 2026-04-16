"""
Persistent Ollama client — one instance lives for the whole session.
Import `get_client()` anywhere; it returns the same object every time.
"""
import requests
from typing import Optional
from config import CONFIG
from logger import logger
from errors import OllamaError, retry_with_backoff


class OllamaClient:
    """
    Session-scoped Ollama client.
    Keeps an open requests.Session for connection re-use across all calls.
    """

    def __init__(self, url: str = None, model: str = None):
        self.url = url or CONFIG.ollama.url
        self.model = model or CONFIG.ollama.model
        self.timeout = CONFIG.ollama.timeout
        self._session = requests.Session()           # persistent TCP connection
        logger.info(f"OllamaClient ready → {self.url} | model={self.model}")

    # ------------------------------------------------------------------
    # Core call – retried automatically via decorator
    # ------------------------------------------------------------------
    @retry_with_backoff(
        max_retries=CONFIG.ollama.max_retries,
        backoff_factor=2.0,
        initial_delay=1.0,
    )
    def call(self, prompt: str, temperature: float = None) -> str:
        """
        Send *prompt* to Ollama and return the raw text response.

        Args:
            prompt:      The full prompt string.
            temperature: Override config temperature for this call only.

        Returns:
            Model response string.

        Raises:
            OllamaError: on any network / format problem.
        """
        temp = temperature if temperature is not None else CONFIG.ollama.temperature
        try:
            logger.info(f"→ Ollama '{self.model}' (temp={temp}) …")
            resp = self._session.post(
                self.url,
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": temp,
                },
                timeout=self.timeout,
            )
            resp.raise_for_status()
            data = resp.json()

            if "response" not in data:
                raise OllamaError(f"Unexpected Ollama response format: {data}")

            result = data["response"].strip()
            logger.info(f"← received {len(result)} chars")
            return result

        except requests.exceptions.ConnectionError as e:
            raise OllamaError(f"Cannot connect to Ollama at {self.url}") from e
        except requests.exceptions.Timeout:
            raise OllamaError(f"Ollama timed out after {self.timeout}s") from None
        except requests.exceptions.RequestException as e:
            raise OllamaError(f"Request failed: {e}") from e

    def close(self):
        self._session.close()
        logger.info("OllamaClient session closed")


# -----------------------------------------------------------------------
# Module-level singleton — created once, reused for the whole process
# -----------------------------------------------------------------------
_client: Optional[OllamaClient] = None


def get_client() -> OllamaClient:
    """Return the session-wide OllamaClient, creating it on first call."""
    global _client
    if _client is None:
        _client = OllamaClient()
    return _client
