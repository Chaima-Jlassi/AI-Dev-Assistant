from mcp_tools.tools_v2 import PlantUMLRenderer
uml='''@startuml
class Calculator {
  +add(a,b)
}
@enduml'''
try:
    r = PlantUMLRenderer()
    data = r._render_online(uml)
    if data:
        print('ONLINE OK, bytes=', len(data))
    else:
        print('ONLINE FAILED')
except Exception as e:
    print('ERROR:', e)
