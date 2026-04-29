"""
MCP Tools - Outils MCP intégrés pour le serveur API
Implémente un système d'outils style MCP avec détection de langage et génération de tests
"""
import re
import subprocess
import time
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

from config import CONFIG
from logger import logger
from errors import PlantUMLError
from mcp_tools.tools_v2 import PlantUMLRenderer


# ============================================================
# Framework de test par langage
# ============================================================

TEST_FRAMEWORKS = {
    "python": {
        "pytest": {"extension": ".py", "command": "pytest"},
        "unittest": {"extension": ".py", "command": "python -m unittest"}
    },
    "javascript": {
        "jest": {"extension": ".test.js", "command": "jest"},
        "mocha": {"extension": ".test.js", "command": "mocha"}
    },
    "typescript": {
        "jest": {"extension": ".test.ts", "command": "jest"},
        "vitest": {"extension": ".test.ts", "command": "vitest"}
    },
    "java": {
        "junit": {"extension": "Test.java", "command": "mvn test"},
        "testng": {"extension": "Test.java", "command": "mvn test"}
    },
    "go": {
        "go test": {"extension": "_test.go", "command": "go test"}
    },
    "rust": {
        "cargo test": {"extension": "_test.rs", "command": "cargo test"}
    },
    "csharp": {
        "nunit": {"extension": "Tests.cs", "command": "dotnet test"},
        "xunit": {"extension": "Tests.cs", "command": "dotnet test"}
    },
    "php": {
        "phpunit": {"extension": "Test.php", "command": "phpunit"}
    },
    "ruby": {
        "rspec": {"extension": "_spec.rb", "command": "rspec"}
    }
}

# ============================================================
# Classe principale MCP Tools
# ============================================================

class MCPTools:
    """
    Ensemble d'outils style MCP pour le projet PCD-FOC
    """
    
    def __init__(self):
        self.plantuml_renderer = PlantUMLRenderer()
        logger.info("MCPTools initialized")
    
    # ============================================================
    # Tool 1: Generate UML Diagram (via PlantUML)
    # ============================================================
    
    def generate_uml_diagram(self, uml_code: str, output_name: str = None) -> Dict[str, Any]:
        """
        Tool: Génère un diagramme UML via PlantUML
        
        Args:
            uml_code: Code PlantUML à rendre
            output_name: Nom du fichier de sortie (optionnel)
            
        Returns:
            Dictionary avec le chemin de l'image générée
        """
        logger.info("MCP Tool: generate_uml_diagram")
        
        try:
            if output_name is None:
                output_name = f"diagram_{int(time.time() * 1000)}.png"
            
            saved_path = self.plantuml_renderer.render(uml_code, output_name)
            
            return {
                "success": True,
                "tool": "generate_uml_diagram",
                "image_path": saved_path,
                "filename": Path(saved_path).name
            }
            
        except Exception as e:
            logger.error(f"Erreur PlantUML: {e}")
            return {
                "success": False,
                "tool": "generate_uml_diagram",
                "error": str(e)
            }
    
    # ============================================================
    # Tool 2: Detect Language
    # ============================================================
    
    def detect_language(self, code: str) -> Dict[str, Any]:
        """
        Tool: Détecte le langage de programmation du code source
        
        Args:
            code: Code source à analyser
            
        Returns:
            Dictionary avec le langage détecté
        """
        logger.info("MCP Tool: detect_language")
        
        # Patterns pour détection de langage
        patterns = {
            "python": [
                r'^def\s+\w+\s*\(',
                r'^class\s+\w+\s*:',
                r'import\s+\w+',
                r'from\s+\w+\s+import',
                r'if\s+__name__\s*==\s*["\']__main__["\']'
            ],
            "javascript": [
                r'^const\s+\w+\s*=',
                r'^let\s+\w+\s*=',
                r'^function\s+\w+\s*\(',
                r'^export\s+(default\s+)?',
                r'require\s*\(',
                r'module\.exports'
            ],
            "typescript": [
                r':\s*(string|number|boolean|any)\s*[=;)]',
                r'^interface\s+\w+',
                r'^type\s+\w+\s*=',
                r'<[A-Z]\w*>',
                r'as\s+(string|number|boolean)'
            ],
            "java": [
                r'^public\s+class\s+\w+',
                r'^private\s+\w+\s+\w+',
                r'^import\s+java\.',
                r'System\.out\.println',
                r'@Override'
            ],
            "go": [
                r'^package\s+\w+',
                r'^func\s+\w+\s*\(',
                r'^import\s+\(',
                r'func\s+\(\w+\s+\*?\w+\)',
                r':='
            ],
            "rust": [
                r'^fn\s+\w+\s*\(',
                r'^let\s+mut\s+',
                r'^impl\s+\w+',
                r'^use\s+\w+::',
                r'#\[derive\('
            ],
            "csharp": [
                r'^using\s+System',
                r'^namespace\s+\w+',
                r'^public\s+class\s+\w+',
                r'Console\.WriteLine',
                r'\[Test\]'
            ],
            "php": [
                r'<\?php',
                r'\$\w+\s*=',
                r'function\s+\w+\s*\(',
                r'->\w+\(',
                r'::\w+'
            ]
        }
        
        code_lower = code.lower()
        scores = {}
        
        for lang, lang_patterns in patterns.items():
            score = sum(1 for pattern in lang_patterns if re.search(pattern, code, re.MULTILINE))
            if score > 0:
                scores[lang] = score
        
        if not scores:
            return {
                "success": True,
                "tool": "detect_language",
                "language": "unknown",
                "confidence": 0.0
            }
        
        detected = max(scores, key=scores.get)
        confidence = scores[detected] / len(patterns[detected])
        
        return {
            "success": True,
            "tool": "detect_language",
            "language": detected,
            "confidence": min(confidence, 1.0),
            "all_scores": scores
        }
    
    # ============================================================
    # Tool 3: Select Test Framework
    # ============================================================
    
    def select_test_framework(self, language: str, preferred: str = None) -> Dict[str, Any]:
        """
        Tool: Sélectionne le framework de test approprié pour le langage
        
        Args:
            language: Langage de programmation détecté
            preferred: Framework préféré (optionnel)
            
        Returns:
            Dictionary avec le framework sélectionné
        """
        logger.info(f"MCP Tool: select_test_framework (lang={language})")
        
        language = language.lower()
        
        if language not in TEST_FRAMEWORKS:
            return {
                "success": False,
                "tool": "select_test_framework",
                "error": f"Language '{language}' not supported for testing"
            }
        
        frameworks = TEST_FRAMEWORKS[language]
        
        # Si un framework préféré est spécifié et disponible
        if preferred and preferred.lower() in frameworks:
            selected = preferred.lower()
        else:
            # Prendre le premier par défaut
            selected = list(frameworks.keys())[0]
        
        framework_info = frameworks[selected]
        
        return {
            "success": True,
            "tool": "select_test_framework",
            "language": language,
            "framework": selected,
            "extension": framework_info["extension"],
            "command": framework_info["command"],
            "available_frameworks": list(frameworks.keys())
        }
    
    # ============================================================
    # Tool 4: Generate Test Cases (via MCP, pas de LLM)
    # ============================================================
    
    def generate_test_cases(self, code: str, language: str = None, framework: str = None) -> Dict[str, Any]:
        """
        Tool: Génère des cas de test via des règles MCP (sans LLM)
        
        Args:
            code: Code source à tester
            language: Langage détecté (optionnel)
            framework: Framework de test (optionnel)
            
        Returns:
            Dictionary avec les tests générés
        """
        logger.info("MCP Tool: generate_test_cases")
        
        # Étape 1: Détecter le langage si pas fourni
        if not language:
            lang_result = self.detect_language(code)
            language = lang_result.get("language", "python")
        
        # Étape 2: Sélectionner le framework si pas fourni
        if not framework:
            fw_result = self.select_test_framework(language)
            framework = fw_result.get("framework", "pytest")
            extension = fw_result.get("extension", ".py")
        else:
            fw_result = self.select_test_framework(language, framework)
            extension = fw_result.get("extension", ".py")
        
        # Étape 3: Générer les tests selon le framework
        try:
            test_code = self._generate_tests_for_framework(code, language, framework)
            
            # Sauvegarder le fichier
            output_name = f"test_generated{extension}"
            output_path = Path(CONFIG.outputs.tests_dir) / output_name
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(test_code, encoding="utf-8")
            
            return {
                "success": True,
                "tool": "generate_test_cases",
                "language": language,
                "framework": framework,
                "test_file": str(output_path),
                "test_code": test_code
            }
            
        except Exception as e:
            logger.error(f"Erreur génération tests: {e}")
            return {
                "success": False,
                "tool": "generate_test_cases",
                "error": str(e)
            }
    
    def _generate_tests_for_framework(self, code: str, language: str, framework: str) -> str:
        """
        Génère les tests selon le framework spécifique
        """
        # Extraire les fonctions/méthodes du code
        functions = self._extract_functions(code, language)
        
        if language == "python":
            return self._generate_python_tests(functions, framework)
        elif language in ["javascript", "typescript"]:
            return self._generate_js_tests(functions, framework)
        elif language == "java":
            return self._generate_java_tests(functions, framework)
        elif language == "go":
            return self._generate_go_tests(functions)
        elif language == "rust":
            return self._generate_rust_tests(functions)
        else:
            return self._generate_generic_tests(functions)
    
    def _extract_functions(self, code: str, language: str) -> List[Dict[str, str]]:
        """
        Extrait les fonctions/méthodes du code source
        """
        functions = []
        
        if language == "python":
            # def function_name(...)
            pattern = r'def\s+(\w+)\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:'
            for match in re.finditer(pattern, code):
                functions.append({
                    "name": match.group(1),
                    "signature": match.group(0)
                })
        
        elif language in ["javascript", "typescript"]:
            # function name(...) ou const name = (...)
            patterns = [
                r'function\s+(\w+)\s*\([^)]*\)',
                r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>',
                r'const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>',
            ]
            for pattern in patterns:
                for match in re.finditer(pattern, code):
                    functions.append({
                        "name": match.group(1),
                        "signature": match.group(0)
                    })
        
        elif language == "java":
            # public/private void methodName(...)
            pattern = r'(?:public|private|protected)\s+(?:static\s+)?(?:\w+)\s+(\w+)\s*\([^)]*\)'
            for match in re.finditer(pattern, code):
                functions.append({
                    "name": match.group(1),
                    "signature": match.group(0)
                })
        
        elif language == "go":
            # func name(...)
            pattern = r'func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\([^)]*\)'
            for match in re.finditer(pattern, code):
                functions.append({
                    "name": match.group(1),
                    "signature": match.group(0)
                })
        
        elif language == "rust":
            # fn name(...)
            pattern = r'fn\s+(\w+)\s*\([^)]*\)'
            for match in re.finditer(pattern, code):
                functions.append({
                    "name": match.group(1),
                    "signature": match.group(0)
                })
        
        return functions
    
    def _generate_python_tests(self, functions: List[Dict], framework: str) -> str:
        """Génère des tests Python"""
        lines = [
            "\"\"\"",
            "Generated test cases via MCP",
            "\"\"\"",
            "",
            "import unittest",
            "from unittest.mock import Mock, patch",
            ""
        ]
        
        if framework == "pytest":
            lines.append("import pytest")
        
        lines.append("")
        
        # Créer une classe de test
        lines.append("class TestGenerated(unittest.TestCase):")
        lines.append("")
        
        for func in functions:
            name = func["name"]
            # Ignorer les fonctions privées et les__
            if name.startswith("_") and not name == "__init__":
                continue
            
            lines.append(f"    def test_{name}(self):")
            lines.append(f'        """Test {name} function"""')
            lines.append(f"        # TODO: Implement test for {name}")
            lines.append("        pass")
            lines.append("")
        
        lines.append("")
        lines.append("if __name__ == '__main__':")
        lines.append("    unittest.main()")
        
        return "\n".join(lines)
    
    def _generate_js_tests(self, functions: List[Dict], framework: str) -> str:
        """Génère des tests JavaScript/TypeScript"""
        lines = [
            "// Generated test cases via MCP",
            "",
        ]
        
        if framework == "jest":
            lines.append("describe('Generated Tests', () => {")
            for func in functions:
                name = func["name"]
                if not name.startswith("_"):
                    lines.append(f"    test('{name}', () => {{")
                    lines.append(f"        // TODO: Implement test for {name}")
                    lines.append("    });")
                    lines.append("")
            lines.append("});")
        
        return "\n".join(lines)
    
    def _generate_java_tests(self, functions: List[Dict], framework: str) -> str:
        """Génère des tests Java"""
        lines = [
            "import org.junit.Test;",
            "import org.junit.Before;",
            "import static org.junit.Assert.*;",
            "",
            "public class GeneratedTest {",
            ""
        ]
        
        for func in functions:
            name = func["name"]
            if not name.startswith("_"):
                lines.append(f"    @Test")
                lines.append(f"    public void test{name}() {{")
                lines.append(f"        // TODO: Implement test for {name}")
                lines.append("    }")
                lines.append("")
        
        lines.append("}")
        
        return "\n".join(lines)
    
    def _generate_go_tests(self, functions: List[Dict]) -> str:
        """Génère des tests Go"""
        lines = [
            "package main",
            "",
            "import (",
            '    "testing"',
            ")",
            ""
        ]
        
        for func in functions:
            name = func["name"]
            if not name.startswith("_"):
                lines.append(f"func Test{name}(t *testing.T) {{")
                lines.append(f"    // TODO: Implement test for {name}")
                lines.append("}")
                lines.append("")
        
        return "\n".join(lines)
    
    def _generate_rust_tests(self, functions: List[Dict]) -> str:
        """Génère des tests Rust"""
        lines = [
            "#[cfg(test)]",
            "mod tests {",
            "    use super::*;",
            ""
        ]
        
        for func in functions:
            name = func["name"]
            if not name.startswith("_"):
                lines.append(f"    #[test]")
                lines.append(f"    fn test_{name}() {{")
                lines.append(f"        // TODO: Implement test for {name}")
                lines.append("    }")
                lines.append("")
        
        lines.append("}")
        
        return "\n".join(lines)
    
    def _generate_generic_tests(self, functions: List[Dict]) -> str:
        """Génère des tests génériques"""
        lines = [
            "// Generated test cases via MCP",
            "// Language not specifically supported",
            ""
        ]
        
        for func in functions:
            name = func["name"]
            lines.append(f"// Test for: {name}")
        
        return "\n".join(lines)


# ============================================================
# Instance globale
# ============================================================

_mcp_tools: Optional[MCPTools] = None


def get_mcp_tools() -> MCPTools:
    """Récupère l'instance globale des outils MCP"""
    global _mcp_tools
    if _mcp_tools is None:
        _mcp_tools = MCPTools()
    return _mcp_tools