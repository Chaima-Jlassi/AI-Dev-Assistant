DOCUMENTS = [

"""Sequence diagram (Login Flow):
@startuml
actor User
participant AuthController
participant AuthService
database DB

User -> AuthController: login(username, password)
AuthController -> AuthService: authenticate()
AuthService -> DB: getUser()
DB --> AuthService: user

alt success
  AuthService --> AuthController: OK
  AuthController --> User: Success
else failure
  AuthService --> AuthController: Error
  AuthController --> User: Failed
end
@enduml
""",

"""Class diagram (Architecture):
@startuml
class AuthController {
  +login()
  +register()
}

class AuthService {
  +authenticate()
}

class User {
  +name
  +password
}

AuthController --> AuthService
AuthService --> User
@enduml
""",

"""Use case diagram (System):
@startuml
actor User
User --> (Login)
User --> (Register)
User --> (Analyze Code)
User --> (Generate UML)
User --> (Run Tests)
User --> (Generate README)
User --> (Download Extension)
@enduml
""",

"""Class diagram (Detailed, Updated):
@startuml

' ===== PACKAGES =====
package "Controllers" {
  class AuthController <<controller>> {
    +login()
    +register()
  }
  class ChatController <<controller>> {
    +chat()
  }
  class CodeAnalysisController <<controller>> {
    +analyzeCode()
  }
  class UMLController <<controller>> {
    +generateUML()
  }
  class TestsController <<controller>> {
    +runTests()
  }
  class ReadmeController <<controller>> {
    +generateReadme()
  }
  class DownloadExtensionController <<controller>> {
    +download()
  }
}

package "Services" {
  class AuthService <<service>> {
    +authenticate()
  }
  class ChatService <<service>> {
    +chat()
  }
  class CodeScoringService <<service>> {
    +score()
  }
  class UMLService <<service>> {
    +generateDiagram()
  }
  class UnitTestService <<service>> {
    +runTests()
  }
  class ReadmeService <<service>> {
    +generateReadme()
  }
  class ExtensionService <<service>> {
    +downloadExtension()
  }
}

package "Models" {
  class User <<model>> {
    +name
    +password
  }
  class UserRequest <<model>> {
    +message
  }
  class AnalysisResult <<model>> {
    +score
  }
  class ScoreResult <<model>> {
    +totalScore
  }
  class UMLDiagramModel <<model>> {
    +diagramData
  }
  class UnitTestResult <<model>> {
    +testResult
  }
  class ReadmeResult <<model>> {
    +readmeContent
  }
}

' ===== RELATIONSHIPS =====
AuthController --> AuthService
ChatController --> ChatService
CodeAnalysisController --> CodeScoringService
CodeAnalysisController --> UMLService
UMLController --> UMLService
TestsController --> UnitTestService
ReadmeController --> ReadmeService
DownloadExtensionController --> ExtensionService

' ===== SERVICE ↔ MODEL =====
AuthService --> User
ChatService --> UserRequest
CodeScoringService --> ScoreResult
UMLService --> UMLDiagramModel
UnitTestService --> UnitTestResult
ReadmeService --> ReadmeResult

@enduml
"""
]