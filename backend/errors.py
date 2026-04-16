import time
from typing import List, Optional, Callable, TypeVar
from logger import logger

T = TypeVar('T')


class PCD_FOCError(Exception):
    pass

class OllamaError(PCD_FOCError):
    pass

class RAGError(PCD_FOCError):
    pass

class PlantUMLError(PCD_FOCError):
    pass

class ValidationError(PCD_FOCError):
    pass


def retry_with_backoff(
    max_retries: int = 3,
    backoff_factor: float = 2.0,
    initial_delay: float = 1.0,
    on_error: Optional[Callable] = None
):
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        def wrapper(*args, **kwargs) -> T:
            delay = initial_delay
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay}s..."
                        )
                        if on_error:
                            on_error(e, attempt + 1)
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(f"All {max_retries} attempts failed for {func.__name__}")
            raise last_exception
        return wrapper
    return decorator


def validate_uml_syntax(uml_code: str) -> bool:
    if not uml_code:
        return False
    if "@startuml" not in uml_code:
        logger.warning("Missing @startuml tag")
        return False
    if "@enduml" not in uml_code:
        logger.warning("Missing @enduml tag")
        return False
    start_idx = uml_code.find("@startuml")
    end_idx = uml_code.find("@enduml")
    if start_idx >= end_idx:
        logger.warning("@startuml comes after @enduml")
        return False
    if len(uml_code[start_idx:end_idx]) < 20:
        logger.warning("UML content too short")
        return False
    return True


def extract_uml_codes(text: str) -> List[str]:
    uml_blocks: List[str] = []
    current = text
    while True:
        start = current.find("@startuml")
        end = current.find("@enduml")
        if start == -1 or end == -1:
            break
        block = current[start:end + len("@enduml")].strip()
        if validate_uml_syntax(block):
            uml_blocks.append(block)
        current = current[end + len("@enduml"):]
    if not uml_blocks:
        logger.warning("No valid UML blocks found in text")
    return uml_blocks
