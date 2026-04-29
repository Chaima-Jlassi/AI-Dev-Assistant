import os
import subprocess
import time
from pathlib import Path
from typing import Optional
from plantuml import PlantUML
import requests

from config import CONFIG
from logger import logger
from errors import PlantUMLError, validate_uml_syntax


class PlantUMLRenderer:
    
    
    def __init__(self, 
                 server_url: str = None,
                 output_dir: str = None,
                 use_local: bool = None):
        self.server_url = server_url or CONFIG.plantuml.server_url
        self.output_dir = output_dir or CONFIG.plantuml.output_dir
        self.use_local = use_local if use_local is not None else CONFIG.plantuml.use_local
        self.timeout = CONFIG.plantuml.timeout
        
        # Create output directory
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info(f"PlantUMLRenderer initialized (use_local={self.use_local})")
    
    def _render_online(self, uml_code: str) -> Optional[bytes]:
        """
        Render via PlantUML online server.
        Tries the plantuml library first, then falls back to a direct
        HTTP GET which exposes the real error if something is wrong.
        """
        for attempt in range(1, 4):
            try:
                logger.info(f"Using online server: {self.server_url} (attempt {attempt}/3)")

                # ── Method 1: plantuml Python library ────────────────────
                try:
                    server = PlantUML(url=self.server_url)
                    image_data = server.processes(uml_code)
                    if image_data:
                        logger.info(f"Rendered via plantuml lib ({len(image_data)} bytes)")
                        return image_data
                    logger.warning("plantuml lib returned empty bytes, trying direct HTTP …")
                except Exception as lib_err:
                    logger.warning(f"plantuml lib error: {lib_err!r} — trying direct HTTP …")

                # ── Method 2: direct HTTP GET (bypasses library quirks) ──
                import zlib, base64, string

                def _encode(text: str) -> str:
                    """PlantUML custom deflate+base64 URL encoding."""
                    compressed = zlib.compress(text.encode("utf-8"))[2:-4]
                    b64 = base64.b64encode(compressed).decode("ascii")
                    src = string.ascii_uppercase + string.ascii_lowercase + string.digits + "+/"
                    dst = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
                    return b64.translate(str.maketrans(src, dst))

                base_url = self.server_url.rstrip("/")
                if base_url.endswith("/png"):
                    base_url = base_url[:-4]
                png_url = f"{base_url}/png/{_encode(uml_code)}"

                logger.info(f"Direct HTTP GET → {png_url[:100]}")
                resp = requests.get(png_url, timeout=self.timeout)

                if resp.status_code == 200 and resp.content:
                    logger.info(f"Rendered via direct HTTP ({len(resp.content)} bytes)")
                    return resp.content

                logger.error(
                    f"Direct HTTP failed: HTTP {resp.status_code}  "
                    f"content-type={resp.headers.get('Content-Type')}  "
                    f"body={resp.text[:300]!r}"
                )

            except Exception as exc:
                logger.error(f"Online render attempt {attempt}/3 exception: {exc!r}")
                if attempt < 3:
                    time.sleep(1.5 * attempt)

        logger.error("Online PlantUML rendering failed after all retries")
        return None
    
    def _render_local(self, uml_code: str) -> Optional[bytes]:
        """
        Render using local PlantUML jar
        
        Requires: Java and plantuml.jar in PATH or PLANTUML_JAR env var
        
        Args:
            uml_code: PlantUML code
            
        Returns:
            PNG image bytes or None if failed
        """
        try:
            # Find plantuml jar
            jar_path = os.getenv("PLANTUML_JAR", "plantuml.jar")
            
            if not os.path.exists(jar_path):
                logger.warning(f"PlantUML jar not found at {jar_path}, falling back to online")
                return None
            
            # Write to temp file
            temp_file = Path(self.output_dir) / ".temp_diagram.puml"
            temp_file.write_text(uml_code)
            
            output_file = temp_file.with_suffix(".png")
            
            # Run plantuml
            logger.info(f"Using local PlantUML: {jar_path}")
            result = subprocess.run(
                ["java", "-jar", jar_path, str(temp_file)],
                capture_output=True,
                text=True,
                timeout=self.timeout
            )
            
            if result.returncode != 0:
                logger.error(f"PlantUML error: {result.stderr}")
                return None
            
            # Read output
            if output_file.exists():
                image_data = output_file.read_bytes()
                temp_file.unlink()
                logger.info(f"Successfully rendered with local PlantUML ({len(image_data)} bytes)")
                return image_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error rendering with local PlantUML: {e}")
            return None
    
    def render(self, uml_code: str, output_file: str = None) -> Optional[str]:
        # Validate UML
        if not validate_uml_syntax(uml_code):
            raise PlantUMLError("Invalid PlantUML syntax")
        
        # Generate output filename if not provided
        if output_file is None:
            import hashlib
            import time
            timestamp = int(time.time() * 1000)
            output_file = f"diagram_{timestamp}.png"
        
        output_path = Path(self.output_dir) / output_file
        
        logger.info(f"Rendering PlantUML diagram to {output_path}...")
        
        # Try local first if configured
        image_data = None
        if self.use_local:
            image_data = self._render_local(uml_code)
        
        # Fall back to online
        if image_data is None:
            image_data = self._render_online(uml_code)
        
        if image_data is None:
            raise PlantUMLError("Failed to render diagram with both online and local methods")
        
        # Save to file
        try:
            output_path.write_bytes(image_data)
            logger.info(f"Diagram saved: {output_path}")
            return str(output_path)
        except Exception as e:
            logger.error(f"Failed to save diagram: {e}")
            raise PlantUMLError(f"Failed to save diagram: {e}") from e


# Convenience function for backward compatibility
def render_plantuml(uml_code: str, output_file: str = "diagram.png") -> Optional[str]:
    """
    Quick render function for PlantUML
    
    Args:
        uml_code: PlantUML code
        output_file: Output filename
        
    Returns:
        Path to generated diagram or None if failed
    """
    try:
        renderer = PlantUMLRenderer()
        return renderer.render(uml_code, output_file)
    except PlantUMLError as e:
        logger.error(f"Rendering failed: {e}")
        return None