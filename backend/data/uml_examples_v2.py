# UML examples data with correct syntax rules embedded as rich examples
DOCUMENTS = [

    # ─────────────────────────────────────────────
    # SEQUENCE DIAGRAM
    # ─────────────────────────────────────────────
    """Sequence diagram rules and example:
RULES:
- Use -> for synchronous messages, --> for return/async messages
- Use activate/deactivate to show object lifelines
- Use alt/else/end for conditional flows
- Use loop for repeated flows
- Use note left/right/over for annotations
- Participants declared with: actor, boundary, control, entity, database, collections, participant

@startuml
actor User
boundary WebUI
control AuthController
entity UserEntity
database DB

User -> WebUI: Submit login form
activate WebUI

WebUI -> AuthController: authenticate(email, password)
activate AuthController

AuthController -> DB: findUserByEmail(email)
activate DB
DB --> AuthController: UserEntity or null
deactivate DB

alt User found
    AuthController -> AuthController: verifyPassword(hash)
    AuthController -> DB: createSession(userId)
    activate DB
    DB --> AuthController: sessionToken
    deactivate DB
    AuthController --> WebUI: 200 OK + token
else User not found
    AuthController --> WebUI: 401 Unauthorized
end

deactivate AuthController
WebUI --> User: Show result
deactivate WebUI
@enduml
""",

    # ─────────────────────────────────────────────
    # CLASS DIAGRAM
    # ─────────────────────────────────────────────
    """Class diagram rules and example:
RULES:
- Attributes and methods go INSIDE the class body between { }
- Visibility: + public, - private, # protected, ~ package
- Inheritance uses: Child --|> Parent  (OUTSIDE class body, NEVER inside { })
- Implementation uses: Child ..|> Interface  (OUTSIDE class body, NEVER inside { })
- Association uses: ClassA "1" --> "*" ClassB : label
- Composition (part cannot exist without whole) uses: Whole "1" *-- "*" Part : label
- Aggregation (part can exist independently) uses: Whole "1" o-- "*" Part : label
- Dependency (uses temporarily) uses: ClassA ..> ClassB : <<use>>
- Multiplicity: "1", "*", "0..1", "1..*" placed near each arrow end
- NEVER put --|>, ..|>, -->, *--, o--, ..> inside a class body
- EVERY class must connect to at least one other class
- ALL relationships listed together AFTER all class/interface/enum definitions
- Group relationships by type with comments for readability

RELATIONSHIP REFERENCE:
  Child --|> Parent                         inheritance
  Child ..|> Interface                      implementation
  ClassA "1" --> "*" ClassB : label         association
  ClassA "1" *-- "*" ClassB : label         composition
  ClassA "1" o-- "*" ClassB : label         aggregation
  ClassA ..> ClassB : <<use>>               dependency

@startuml

interface Payable {
  +processPayment(): bool
  +refund(): bool
}

interface Notifiable {
  +sendNotification(message: String): void
  +markAsRead(): void
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

enum PaymentMethod {
  CREDIT_CARD
  BANK_TRANSFER
  PAYPAL
}

abstract class User {
  -id: int
  -name: String
  -email: String
  -password: String
  -phone: String
  -role: String
  +login(): bool
  +logout(): void
  +updateProfile(): void
}

class Administrator {
  -adminLevel: int
  -permissions: List<String>
  +manageUsers(): void
  +manageHotels(): void
  +manageFlights(): void
}

class Customer {
  -passportNumber: String
  -nationality: String
  -loyaltyPoints: int
  +makeBooking(): Booking
  +cancelBooking(): void
  +writeReview(): Review
}

class TravelAgent {
  -agencyBranch: String
  -commissionRate: float
  +createPackage(): TravelPackage
  +assignToBooking(): void
}

class Hotel {
  -id: int
  -name: String
  -address: String
  -stars: int
  -pricePerNight: float
  +checkAvailability(): bool
  +getRooms(): List<Room>
}

class Room {
  -id: int
  -roomNumber: int
  -type: String
  -capacity: int
  -pricePerNight: float
  -isAvailable: bool
  +book(): void
  +release(): void
}

class Flight {
  -id: int
  -flightNumber: String
  -origin: String
  -destination: String
  -departureTime: DateTime
  -arrivalTime: DateTime
  -price: float
  +checkSeats(): int
}

class TravelPackage {
  -id: int
  -name: String
  -description: String
  -price: float
  -duration: int
  -destinations: List<String>
  +calculatePrice(): float
  +isAvailable(): bool
}

class Booking {
  -id: int
  -bookingDate: DateTime
  -totalAmount: float
  -paymentStatus: String
  -bookingStatus: BookingStatus
  +confirm(): void
  +cancel(): void
  +calculateTotal(): float
}

class HotelBooking {
  -id: int
  -checkInDate: DateTime
  -checkOutDate: DateTime
  -totalPrice: float
  -status: String
  +getDuration(): int
}

class FlightBooking {
  -id: int
  -seatNumber: String
  -class: String
  -totalPrice: float
  -status: String
  +selectSeat(): void
}

class Payment {
  -id: int
  -amount: float
  -method: PaymentMethod
  -transactionId: String
  -date: DateTime
  -status: String
  +process(): bool
  +refund(): bool
}

class Bank {
  -id: int
  -name: String
  -code: String
  -apiEndpoint: String
  +connect(): bool
}

class BankTransaction {
  -id: int
  -transactionRef: String
  -amount: float
  -currency: String
  -status: String
  -timestamp: DateTime
  +execute(): bool
  +verify(): bool
}

class Notification {
  -id: int
  -message: String
  -type: String
  -date: DateTime
  -isRead: bool
  +send(): void
  +markAsRead(): void
}

class Review {
  -id: int
  -rating: float
  -comment: String
  -date: DateTime
  +submit(): void
  +edit(): void
}

' ── INHERITANCE ──────────────────────────────────────────
Administrator --|> User
Customer --|> User
TravelAgent --|> User

' ── INTERFACE IMPLEMENTATION ─────────────────────────────
Payment ..|> Payable
Customer ..|> Notifiable
Administrator ..|> Notifiable

' ── COMPOSITIONS (part cannot exist without whole) ────────
Booking "1" *-- "1..*" HotelBooking : contains
Booking "1" *-- "0..*" FlightBooking : contains
Hotel "1" *-- "1..*" Room : has
Payment "1" *-- "0..1" BankTransaction : processed via

' ── ASSOCIATIONS ─────────────────────────────────────────
Customer "1" --> "0..*" Booking : places
Customer "1" --> "0..*" Review : writes
Booking "1" --> "1" Payment : paid by
HotelBooking "0..*" --> "1" Hotel : references
HotelBooking "0..*" --> "1" Room : reserves
FlightBooking "0..*" --> "1" Flight : references
BankTransaction "0..*" --> "1" Bank : processed through
Notification "0..*" --> "1" User : sent to
Review "0..*" --> "0..1" Hotel : about
Review "0..*" --> "0..1" TravelPackage : about

' ── AGGREGATIONS (parts can exist independently) ──────────
TravelPackage "0..*" o-- "0..*" Hotel : includes
TravelPackage "0..*" o-- "0..*" Flight : includes

' ── DEPENDENCIES ─────────────────────────────────────────
TravelAgent ..> TravelPackage : <<creates>>
Administrator ..> User : <<manages>>
Administrator ..> Hotel : <<manages>>
Administrator ..> Flight : <<manages>>
Administrator ..> TravelPackage : <<manages>>

@enduml
""",

    # ─────────────────────────────────────────────
    # USE CASE DIAGRAM
    # ─────────────────────────────────────────────
    """Use case diagram rules and example:
RULES:
- Actors declared with: actor ActorName
- Use cases in parentheses: (Use Case Name)
- Actor to use case: Actor --> (Use Case)
- Include relationship: (UseCase) .> (Included) : <<include>>
- Extend relationship: (Extended) .> (UseCase) : <<extend>>
- Actor inheritance: SpecialActor --|> GeneralActor
- Group use cases in rectangles: rectangle "System Name" { }
- Notes: note right of (UseCase) : text

@startuml
left to right direction

actor Guest
actor Customer
actor Administrator
actor TravelAgent

Customer --|> Guest
Administrator --|> Customer

rectangle "Travel Agency System" {

  ' Guest use cases
  Guest --> (Browse Packages)
  Guest --> (Search Flights)
  Guest --> (Register)

  ' Customer use cases
  Customer --> (Login)
  Customer --> (Book Package)
  Customer --> (Make Payment)
  Customer --> (Write Review)
  Customer --> (View Booking History)
  Customer --> (Receive Notification)

  ' TravelAgent use cases
  TravelAgent --> (Create Travel Package)
  TravelAgent --> (Manage Bookings)

  ' Administrator use cases
  Administrator --> (Manage Users)
  Administrator --> (Manage Hotels)
  Administrator --> (Manage Flights)

  ' Include/Extend
  (Book Package) .> (Make Payment) : <<include>>
  (Make Payment) .> (Process Bank Transaction) : <<include>>
  (Login) .> (Validate Credentials) : <<include>>
  (Register) .> (Send Welcome Email) : <<extend>>
}
@enduml
""",

    # ─────────────────────────────────────────────
    # ACTIVITY DIAGRAM
    # ─────────────────────────────────────────────
    """Activity diagram rules and example:
RULES:
- Start node: start
- End node: stop or end
- Actions in colons: :Action Name;
- Conditionals: if (condition?) then (yes) ... else (no) ... endif
- Loops: while (condition?) ... endwhile  OR  repeat ... repeat while (condition?)
- Parallel flows: fork ... fork again ... end fork
- Swimlanes: |SwimlaneName| before an action
- Notes: note left/right : text
- Connectors for long flows: (A) then later (A)

@startuml
start

|Customer|
:Select travel package;
:Fill booking form;

|System|
:Validate booking details;

if (Details valid?) then (yes)
  |System|
  :Calculate total price;
  :Create booking record (PENDING);

  |Customer|
  :Enter payment details;

  |Payment Service|
  :Process payment;

  if (Payment successful?) then (yes)
    |System|
    :Update booking status to CONFIRMED;
    :Generate booking confirmation;

    fork
      |Notification Service|
      :Send email confirmation;
    fork again
      |Notification Service|
      :Send SMS notification;
    end fork

    |Customer|
    :View booking confirmation;
    stop

  else (no)
    |System|
    :Update booking status to FAILED;
    |Customer|
    :Show payment failure message;
    stop
  endif

else (no)
  |System|
  :Return validation errors;
  |Customer|
  :Correct booking form;
  stop
endif
@enduml
""",

    # ─────────────────────────────────────────────
    # COMPONENT DIAGRAM
    # ─────────────────────────────────────────────
    """Component diagram rules and example:
RULES:
- Components: component [ComponentName] or [ComponentName]
- Interfaces: interface InterfaceName or () InterfaceName
- Packages/layers: package "Name" { } or node "Name" { } or cloud "Name" { }
- Dependencies: [ComponentA] --> [ComponentB]
- Provided interface: [Component] - InterfaceName
- Required interface: [Component] )-- InterfaceName
- Database: database "DBName"
- Queues/async: queue "QueueName"
- Explicit component: component "Long Name" as alias

@startuml

package "Client Layer" {
  component [Web Browser] as Web
  component [Mobile App] as Mobile
}

package "API Gateway" {
  component [Load Balancer] as LB
  component [Auth Middleware] as Auth
}

package "Microservices" {
  component [Booking Service] as BookingSvc
  component [Payment Service] as PaymentSvc
  component [Notification Service] as NotifSvc
  component [User Service] as UserSvc
}

package "Data Layer" {
  database "Main DB" as MainDB
  database "Cache (Redis)" as Cache
  queue "Message Queue" as MQ
}

package "External Services" {
  component [Bank API] as BankAPI
  component [Email Provider] as EmailSvc
  component [SMS Gateway] as SMSSvc
}

' Client to gateway
Web --> LB
Mobile --> LB

' Gateway routing
LB --> Auth
Auth --> BookingSvc
Auth --> PaymentSvc
Auth --> UserSvc

' Service interactions
BookingSvc --> MainDB
BookingSvc --> Cache
BookingSvc --> MQ

PaymentSvc --> BankAPI
PaymentSvc --> MainDB
PaymentSvc --> MQ

MQ --> NotifSvc
NotifSvc --> EmailSvc
NotifSvc --> SMSSvc

UserSvc --> MainDB
@enduml
""",

    # ─────────────────────────────────────────────
    # ENTITY-RELATIONSHIP (ER) DIAGRAM
    # ─────────────────────────────────────────────
    """Entity-Relationship diagram rules and example:
RULES:
- Use class keyword for entities
- Primary keys marked with <<PK>>
- Foreign keys marked with <<FK>>
- All relationships declared OUTSIDE entity bodies
- One-to-many: Entity1 "1" --> "*" Entity2
- Many-to-many: Entity1 "*" --> "*" Entity2
- Optional: Entity1 "1" --> "0..1" Entity2
- Composition for strong ownership: Entity1 *-- Entity2
- Use ' for comments

@startuml

entity User {
  +id: int <<PK>>
  --
  name: String
  email: String
  password: String
  role: String
}

entity Booking {
  +id: int <<PK>>
  --
  bookingDate: DateTime
  totalAmount: float
  paymentStatus: String
  bookingStatus: String
  customerId: int <<FK>>
}

entity Payment {
  +id: int <<PK>>
  --
  amount: float
  method: String
  transactionId: String
  date: DateTime
  status: String
  bookingId: int <<FK>>
}

entity Hotel {
  +id: int <<PK>>
  --
  name: String
  address: String
  stars: int
  pricePerNight: float
}

entity Room {
  +id: int <<PK>>
  --
  roomNumber: int
  type: String
  capacity: int
  pricePerNight: float
  isAvailable: bool
  hotelId: int <<FK>>
}

entity HotelBooking {
  +id: int <<PK>>
  --
  checkInDate: DateTime
  checkOutDate: DateTime
  totalPrice: float
  status: String
  bookingId: int <<FK>>
  hotelId: int <<FK>>
  roomId: int <<FK>>
}

' Relationships (ALL outside entity bodies)
User "1" --> "*" Booking : places
Booking "1" *-- "1" Payment : paid via
Hotel "1" *-- "*" Room : has
Booking "1" *-- "*" HotelBooking : contains
HotelBooking "*" --> "1" Hotel : references
HotelBooking "*" --> "1" Room : reserves
@enduml
""",

    # ─────────────────────────────────────────────
    # STATE DIAGRAM
    # ─────────────────────────────────────────────
    """State diagram rules and example:
RULES:
- Initial state: [*] --> StateName
- Final state: StateName --> [*]
- Transitions: State1 --> State2 : event / action
- Nested states: state "Name" as alias { }
- Choice pseudostate: state Choice <<choice>>
- Concurrent regions: state StateName { State1 \n -- \n State2 }
- Notes: note right of StateName : text

@startuml

[*] --> Pending : booking created

Pending --> Confirmed : payment successful
Pending --> Cancelled : payment failed
Pending --> Cancelled : user cancels

Confirmed --> Completed : trip date passed
Confirmed --> Cancelled : user cancels (refund)

Cancelled --> [*]
Completed --> [*]

state Confirmed {
  [*] --> AwaitingDeparture
  AwaitingDeparture --> InProgress : departure date reached
  InProgress --> Finished : arrival date reached
  Finished --> [*]
}

note right of Pending : Initial state after\nbooking is created
note right of Cancelled : Triggers refund\nprocess if paid
@enduml
""",

    # ─────────────────────────────────────────────
    # DEPLOYMENT DIAGRAM
    # ─────────────────────────────────────────────
    """Deployment diagram rules and example:
RULES:
- Physical nodes: node "NodeName"
- Server/device: node "Name" <<device>> or node "Name" <<server>>
- Artifacts deployed on nodes go inside node blocks
- artifact "ArtifactName"
- Connections between nodes: Node1 --> Node2 : protocol
- Nested nodes for VMs/containers inside physical servers

@startuml

node "Client Devices" <<device>> {
  artifact "Web Browser"
  artifact "Mobile App (iOS/Android)"
}

node "Cloud Infrastructure" <<cloud>> {

  node "Load Balancer" <<server>> {
    artifact "Nginx"
  }

  node "App Server 1" <<server>> {
    artifact "Booking Service"
    artifact "User Service"
  }

  node "App Server 2" <<server>> {
    artifact "Payment Service"
    artifact "Notification Service"
  }

  node "Database Server" <<server>> {
    artifact "PostgreSQL"
    artifact "Redis Cache"
  }

  node "Message Broker" <<server>> {
    artifact "RabbitMQ"
  }
}

node "External Services" <<cloud>> {
  artifact "Bank Payment API"
  artifact "SendGrid (Email)"
  artifact "Twilio (SMS)"
}

"Client Devices" --> "Load Balancer" : HTTPS
"Load Balancer" --> "App Server 1" : HTTP
"Load Balancer" --> "App Server 2" : HTTP
"App Server 1" --> "Database Server" : TCP/5432
"App Server 2" --> "Message Broker" : AMQP
"Message Broker" --> "App Server 2" : AMQP
"App Server 2" --> "External Services" : HTTPS
@enduml
"""
]


# Metadata for each document (for categorized retrieval)
DOCUMENT_METADATA = {
    DOCUMENTS[0]: {
        "type": "sequence",
        "tags": ["authentication", "flow", "interaction", "lifeline", "alt", "activate"],
        "description": "Sequence diagram with correct syntax: actors, activation bars, alt/else, async returns"
    },
    DOCUMENTS[1]: {
        "type": "class",
        "tags": ["objects", "attributes", "methods", "inheritance", "composition", "aggregation", "association", "dependency", "multiplicity", "interface", "enum", "abstract", "relationships", "connections"],
        "description": "Class diagram with ALL relationship types: inheritance (--|>), implementation (..|>), association (-->), composition (*--), aggregation (o--), dependency (..>). Every class is connected. All relationships grouped after class definitions."
    },
    DOCUMENTS[2]: {
        "type": "use_case",
        "tags": ["actors", "functionality", "include", "extend", "system_scope"],
        "description": "Use case diagram with correct syntax: actors, include/extend, actor inheritance, rectangles"
    },
    DOCUMENTS[3]: {
        "type": "activity",
        "tags": ["process", "workflow", "decision", "swimlane", "fork", "parallel"],
        "description": "Activity diagram with correct syntax: swimlanes, conditionals, parallel forks, loops"
    },
    DOCUMENTS[4]: {
        "type": "component",
        "tags": ["architecture", "layers", "microservices", "packages", "interfaces", "integration"],
        "description": "Component diagram with correct syntax: packages, components, interfaces, dependencies"
    },
    DOCUMENTS[5]: {
        "type": "entity_relationship",
        "tags": ["database", "entities", "primary_key", "foreign_key", "relations", "ER"],
        "description": "ER diagram with correct syntax: entities, PK/FK, multiplicities outside body"
    },
    DOCUMENTS[6]: {
        "type": "state",
        "tags": ["state_machine", "transitions", "events", "nested_states", "lifecycle"],
        "description": "State diagram with correct syntax: initial/final states, transitions, nested states"
    },
    DOCUMENTS[7]: {
        "type": "deployment",
        "tags": ["infrastructure", "nodes", "artifacts", "servers", "cloud", "physical"],
        "description": "Deployment diagram with correct syntax: nodes, artifacts, nested nodes, protocols"
    }
}