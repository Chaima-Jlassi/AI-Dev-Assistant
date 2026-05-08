from mcp_tools.tools_v2 import PlantUMLRenderer
uml='''@startuml
class Calculator {
  -display: Display
  -memory: Memory

  +add(num1: int, num2: int): int
}

interface Display {
  +show(value: String)
}

interface Memory {
  +store(value: int)
  +recall(): int
}

class Adder implements Calculator, Memory {
  -memoryValue: int

  +add(num1: int, num2: int): int
  +store(value: int): void
  +recall(): int

  Display display
  Adder(display: Display)
}

Calculator <|-- Adder
@enduml'''
try:
    r = PlantUMLRenderer()
    out = r.render(uml, output_file='test_diagram.png')
    print('Rendered to', out)
except Exception as e:
    print('Render error:', e)
