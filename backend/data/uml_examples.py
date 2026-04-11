DOCUMENTS = [

"""Sequence diagram login:
@startuml
User -> System: Login request
System -> DB: Check credentials
DB --> System: OK
System --> User: Success
@enduml
""",

"""Class diagram example:
@startuml
class User {
  +name
  +login()
}

class System {
  +authenticate()
}

User --> System
@enduml
""",

"""Use case example:
@startuml
actor User
User --> (Login)
User --> (Register)
@enduml
"""
]