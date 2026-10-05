# Bookkeepro Project Analysis & Workflow
`
This document provides a comprehensive technical analysis of the **Bookkeepro** platform, including its system architecture, technology stack, and diagrammatic representations of its core workflows.
`
## 1. System Architecture & Tech Stack
`
Bookkeepro is structured as a modern, containerized web application using a decoupled Frontend/Backend architecture.
`
### Technology Stack
*   **Frontend:** React (Vite), React Router, Context API for state management, pure CSS for styling.
*   **Backend:** Python 3.12, FastAPI, SQLAlchemy (ORM), JWT for authentication.
*   **Database:** MySQL (MariaDB).
*   **Infrastructure:** Docker & Docker Compose, Nginx (Reverse Proxy & Static File Serving).
*   **AI Integration:** LLM integration (OpenRouter/Gemini) for the intelligent chatbot assistant.
`
### High-Level Architecture Diagram
`
```mermaid
graph TD
    Client[Web Browser / Client] -->|HTTPS Requests| Nginx[Nginx Reverse Proxy]
    
    subgraph bookkeepro_network[Docker Network: bookkeepro_default]
        Nginx -->|/api/*| FastAPI[FastAPI Backend Container]
        Nginx -->|Static Assets| React[React Frontend Container]
        
        FastAPI <-->|SQL Queries| MySQL[(MySQL Database Container)]
        FastAPI <-->|API Calls| LLM((OpenRouter / LLM API))
    end
    
    classDef client fill:#f9f,stroke:#333,stroke-width:2px;
    classDef proxy fill:#fcc,stroke:#333,stroke-width:2px;
    classDef app fill:#ccf,stroke:#333,stroke-width:2px;
    classDef db fill:#ff9,stroke:#333,stroke-width:2px;
    classDef external fill:#eee,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;
    
    class Client client;
    class Nginx proxy;
    class FastAPI,React app;
    class MySQL db;
    class LLM external;
`
`
---
`
## 2. Core Workflows
`
### A. Authentication & Authorization Workflow
The system uses stateless JSON Web Tokens (JWT) for authentication. Roles (\user\, \dmin\, \super_admin\) dictate access levels across the platform.
`
```mermaid
sequenceDiagram
    participant User as User/Client
    participant Frontend as React UI
    participant Backend as FastAPI
    participant DB as MySQL
`
    User->>Frontend: Enters Email & Password
    Frontend->>Backend: POST /api/auth/login
    Backend->>DB: Query User by Email
    DB-->>Backend: Returns User Record & Hashed Password
    
    alt Invalid Credentials
        Backend-->>Frontend: 401 Unauthorized
        Frontend-->>User: Show Error Message
    else Valid Credentials
        Backend->>Backend: Generate JWT (Access Token)
        Backend-->>Frontend: 200 OK + JWT Token
        Frontend->>Frontend: Store Token (LocalStorage)
        Frontend->>User: Redirect to Dashboard
    end
`
`
### B. Document Management & Review Workflow
This is the core operational flow where users submit personal (W-2s, 1099s) or business documents, and admins review them.
`
```mermaid
stateDiagram-v2
    [*] --> Uploaded
    
    state Uploaded {
        [*] --> PendingReview
        note right of PendingReview
            User uploads file.
            Stored on disk, record in DB.
        end note
    }
    
    PendingReview --> Approved: Admin approves
    PendingReview --> Rejected: Admin rejects (with reason)
    
    Approved --> [*]
    
    Rejected --> ActionRequired
    note left of ActionRequired
        User notified.
        Must upload replacement.
    end note
    
    ActionRequired --> PendingReview: User re-uploads
`
`
### C. AI Chatbot Workflow
The platform features an AI assistant that can query database context (like user stats and pending documents) to provide intelligent answers to both users and admins.
`
```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant Chat UI as Frontend Chat
    participant ChatAPI as FastAPI (/api/chatbot)
    participant DB as MySQL DB
    participant LLM as OpenRouter LLM
`
    Admin->>Chat UI: "How many pending documents do we have?"
    Chat UI->>ChatAPI: POST /api/chatbot/ask (Auth Token)
    ChatAPI->>ChatAPI: Validate Token & Role
    
    ChatAPI->>DB: Query system stats (get_admin_status)
    DB-->>ChatAPI: Returns {total_users, pending_docs, etc.}
    
    ChatAPI->>ChatAPI: Build Context Prompt (System Prompt + DB Stats + User Query)
    
    ChatAPI->>LLM: POST Prompt for Completion
    LLM-->>ChatAPI: Returns AI Response
    
    ChatAPI->>DB: Log ChatMessage (History)
    ChatAPI-->>Chat UI: Returns formatted Markdown response
    Chat UI-->>Admin: Displays answer
`
`
`### D. Detailed User (Client) Workflow
```mermaid
flowchart TD
    A[Landing Site: Home, About, Services] --> B{Has Account?}
    B -- No --> C[Sign Up]
    B -- Yes --> D[Login]
    C --> D
    
    D -->|JWT Token Granted| E[Client Dashboard]
    
    E --> F{Upload Documents?}
    F -->|Yes| G[Select Year & Type]
    G --> H[Upload Personal Docs<br/>e.g., W-2, 1040]
    G --> I[Upload Business Docs<br/>e.g., 1099, Receipts]
    
    H --> J[Status: Pending Review]
    I --> J
    
    J --> K{Admin Review}
    K -- Approved --> L[Status: Approved]
    K -- Rejected --> M[Status: Action Required]
    
    M --> N[View Rejection Reason]
    N -->|Re-upload file| G
    
    E --> O[View Completed Files]
    O --> P[Download Tax Returns / Reports<br/>uploaded by Admin]
    
    classDef public fill:#f9f,stroke:#333,stroke-width:2px;
    classDef auth fill:#fcc,stroke:#333,stroke-width:2px;
    classDef dash fill:#ccf,stroke:#333,stroke-width:2px;
    classDef action fill:#ff9,stroke:#333,stroke-width:2px;
    classDef pending fill:#e6e6e6,stroke:#333,stroke-width:2px;
    classDef success fill:#b3ffb3,stroke:#009933,stroke-width:2px;
    classDef danger fill:#ffb3b3,stroke:#cc0000,stroke-width:2px;
    
    class A public;
    class C,D auth;
    class E dash;
    class H,I,O,P,G,N action;
    class J pending;
    class L success;
    class M danger;
`
``n### E. Detailed Admin (Accountant) Workflow
```mermaid
flowchart TD
    A[Login Portal] -->|JWT Role = Admin| B[Admin Dashboard]
    
    B --> C[View AI Daily Digest]
    C -->|Ask Questions| D[Chatbot Queries DB<br/>e.g. 'Show pending docs']
    
    B --> E[View All Clients List]
    E -->|Click on Client| F[Client Detail View]
    
    F --> G{Review Client Docs}
    
    G --> H[View Pending Personal Docs]
    G --> I[View Pending Business Docs]
    
    H --> J{Quality Control}
    I --> J
    
    J -- Looks Good --> K[Click Approve]
    J -- Blurry/Incorrect --> L[Click Reject & Add Reason]
    
    K --> M[Process Taxes/Bookkeeping Offline]
    
    M --> N[Upload Finalized Work]
    N --> O[Saved as Admin Document]
    O -->|Client sees it on their end| F
    
    classDef auth fill:#fcc,stroke:#333,stroke-width:2px;
    classDef dash fill:#ccf,stroke:#333,stroke-width:2px;
    classDef ai fill:#f9f,stroke:#333,stroke-width:2px;
    classDef view fill:#ff9,stroke:#333,stroke-width:2px;
    classDef success fill:#b3ffb3,stroke:#009933,stroke-width:2px;
    classDef danger fill:#ffb3b3,stroke:#cc0000,stroke-width:2px;
    classDef db fill:#eee,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;
    
    class A auth;
    class B dash;
    class C,D ai;
    class E,F,H,I view;
    class K success;
    class L danger;
    class M,N,O db;
`
``n---
``n## 3. Directory Structure Map
`
`	ext
Bookkeepro/
├── docker-compose.yml       # Orchestrates the containers (App, DB, Nginx)
├── Makefile                 # Automation scripts (make deploy, make logs)
├── .env                     # Environment variables (DB credentials, API keys)
├── frontend/                # React Application
│   ├── index.html           # Entry point
│   ├── package.json
│   ├── vite.config.js       # Bundler configuration
│   ├── src/                 # React components, pages, and contexts
│   └── public/              # CSS, Images, Static assets
├── services/api/            # FastAPI Backend Application
│   ├── main.py              # Application factory and router inclusion
│   ├── requirements.txt
│   ├── app/                 
│   │   ├── auth/            # JWT logic, Security dependencies
│   │   ├── routers/         # API Endpoints (auth.py, users.py, docs.py, chatbot.py)
│   │   ├── models.py        # SQLAlchemy ORM Models
│   │   ├── schemas.py       # Pydantic validation models
│   │   ├── crud.py          # Database operations
│   │   └── db.py            # Database connection pool setup
│   └── uploads/             # Mounted volume for physical document storage
└── nginx/                   # Reverse Proxy Configuration
    └── conf.d/default.conf  # Routing rules for /api and static files
`
`
## 4. Key Technical Decisions & Security
`
1.  **Reverse Proxy (Nginx):** Handles SSL termination (if applied) and efficiently serves the built React static files from /usr/share/nginx/html. It forwards any request starting with /api/ directly to the FastAPI container on port 8000.
2.  **Containerized Database:** Uses a dedicated MySQL volume to ensure data persistence across container restarts. The entrypoint.sh script handles internal permission alignments (gosu) to prevent permission denied errors on Linux hosts.
3.  **Stateless API:** The backend uses JWTs instead of session cookies, making the API easily scalable and preventing CSRF vulnerabilities naturally.
4.  **Role-Based Access Control (RBAC):** Middleware in FastAPI explicitly checks user roles. A user trying to hit an admin endpoint receives an automatic 403 Forbidden without executing the route logic.
`

`
### Security & Routing Architecture Diagram
```mermaid
flowchart TD
    Client[Client Browser] -->|HTTP/HTTPS Request| Nginx[Nginx Reverse Proxy]
    
    Nginx -->|Route: /api/*| Backend[FastAPI Backend]
    Nginx -->|Route: /| Frontend[Static React Files]
    
    subgraph FastAPI_Security_Layer[FastAPI Security Middleware]
        Backend --> JWTCheck{Valid JWT Token?}
        JWTCheck -- No --> Reject401[401 Unauthorized]
        JWTCheck -- Yes --> RoleCheck{Role Check}
        
        RoleCheck -- Admin Endpoint + User Role --> Reject403[403 Forbidden]
        RoleCheck -- Admin Endpoint + Admin Role --> Route[Execute Route Logic]
        RoleCheck -- User Endpoint --> Route
    end
    
    Route --> DB[(MySQL Database)]
    
    classDef reject fill:#ffb3b3,stroke:#cc0000;
    classDef success fill:#b3ffb3,stroke:#009933;
    classDef proxy fill:#e6f2ff,stroke:#0066cc;
    
    class Reject401,Reject403 reject;
    class Route success;
    class Nginx proxy;
`
`
