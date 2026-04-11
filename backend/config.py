# Configuration module for PCD-FOC
import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class OllamaConfig:
    url: str = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    model: str = os.getenv("OLLAMA_MODEL", "mistral")
    timeout: int = int(os.getenv("OLLAMA_TIMEOUT", "180"))
    max_retries: int = int(os.getenv("OLLAMA_MAX_RETRIES", "3"))
    temperature: float = float(os.getenv("OLLAMA_TEMPERATURE", "0.3"))


@dataclass
class PlantUMLConfig:
    server_url: str = os.getenv("PLANTUML_URL", "http://www.plantuml.com/plantuml/png/")
    timeout: int = int(os.getenv("PLANTUML_TIMEOUT", "30"))
    output_dir: str = os.getenv("PLANTUML_OUTPUT_DIR", "./outputs/diagrams")
    use_local: bool = os.getenv("PLANTUML_LOCAL", "false").lower() == "true"


@dataclass
class RAGConfig:
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    top_k: int = int(os.getenv("RAG_TOP_K", "2"))
    min_similarity: float = float(os.getenv("RAG_MIN_SIMILARITY", "0.3"))


@dataclass
class OutputConfig:
    diagrams_dir: str = os.getenv("OUTPUT_DIAGRAMS_DIR", "./outputs/diagrams")
    readme_dir: str = os.getenv("OUTPUT_README_DIR", "./outputs/readme")
    tests_dir: str = os.getenv("OUTPUT_TESTS_DIR", "./outputs/tests")
    explanations_dir: str = os.getenv("OUTPUT_EXPLANATIONS_DIR", "./outputs/explanations")


@dataclass
class AppConfig:
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: Optional[str] = os.getenv("LOG_FILE", None)

    ollama: OllamaConfig = field(default_factory=OllamaConfig)
    plantuml: PlantUMLConfig = field(default_factory=PlantUMLConfig)
    rag: RAGConfig = field(default_factory=RAGConfig)
    outputs: OutputConfig = field(default_factory=OutputConfig)

    def __post_init__(self):
        for attr in vars(self.outputs).values():
            os.makedirs(attr, exist_ok=True)


CONFIG = AppConfig()
