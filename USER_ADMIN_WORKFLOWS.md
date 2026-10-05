# Bookkeepro Workflows

This document visualizes the step-by-step journeys for Users, Admins, and Super Admins based on the core system logic.

## 1. User Workflow

```mermaid
flowchart TD
    A[Landing: Home, About, Services, Contact] --> B{Has account?}
    B -- No --> C[Signup page]
    B -- Yes --> D[Login page]
    C --> D
    
    D --> E[Forgot password page]
    E -->|Email link| F[Reset password page]
    
    D -->|Login success| G[User dashboard]
    
    G --> H[Acknowledge engagement letter]
    H --> I{Document type}
    
    I -- Personal --> J[Upload personal docs]
    I -- Business --> K[Upload business docs]
    
    J --> L[Saved, sent for review]
    K --> L
    
    L --> M{Admin decision}
    M -- Approved --> N[Filed]
    M -- Changes requested --> O[Notified]
    O -- resubmit --> I
    
    G --> P[Chatbot, deadlines, bookmarks]
    G --> Q[Logout]
    
    classDef public fill:#f9f,stroke:#333,stroke-width:2px;
    classDef auth fill:#fcc,stroke:#333,stroke-width:2px;
    classDef dash fill:#ccf,stroke:#333,stroke-width:2px;
    classDef action fill:#ff9,stroke:#333,stroke-width:2px;
    classDef pending fill:#e6e6e6,stroke:#333,stroke-width:2px;
    classDef success fill:#b3ffb3,stroke:#009933,stroke-width:2px;
    classDef danger fill:#ffb3b3,stroke:#cc0000,stroke-width:2px;
    
    class A public;
    class C,D,E,F auth;
    class G dash;
    class H,I,J,K,P,O action;
    class L pending;
    class N success;
    class M danger;
```

---

## 2. Admin Workflow

```mermaid
flowchart TD
    A[Login as admin] --> B[Admin dashboard]
    
    B --> C[Users tab]
    B --> D[Templates tab]
    B --> E[Bulk actions via AI chatbot]
    
    C --> F[Open user detail]
    F --> G[Personal / business docs]
    F --> H[Returns for review]
    F --> I[Audit trail]
    F --> J[Export user docs as zip]
    
    G --> K{Review document}
    K -- Approve --> L[Mark filed, notify user]
    K -- Request changes --> M[Notify user]
    
    L --> N[Audit trail logged]
    M --> N
    
    B --> O[Logout]
    
    classDef auth fill:#fcc,stroke:#333,stroke-width:2px;
    classDef dash fill:#ccf,stroke:#333,stroke-width:2px;
    classDef view fill:#ff9,stroke:#333,stroke-width:2px;
    classDef success fill:#b3ffb3,stroke:#009933,stroke-width:2px;
    classDef danger fill:#ffb3b3,stroke:#cc0000,stroke-width:2px;
    classDef db fill:#eee,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;
    
    class A auth;
    class B dash;
    class C,D,E,F,G,H,I,J view;
    class L success;
    class M danger;
    class N db;
```

---

## 3. Super Admin Workflow

```mermaid
flowchart TD
    A[Login as super admin] --> B[Admin dashboard]
    B --> C[All admin capabilities]
    
    B --> D[Open user detail]
    D --> E{Viewing own account?}
    
    E -- Yes --> F[Role dropdown hidden]
    E -- No --> G[Role dropdown visible]
    
    G --> H[Select new role]
    H --> I{Validate rules}
    
    I -- Rule violated<br>Not self, not super admin via API<br>Keep 1+ super admin --> J[Rejected]
    I -- Valid --> K[Role updated]
    
    J --> L[Audit trail logged]
    K --> L
    
    classDef auth fill:#fcc,stroke:#333,stroke-width:2px;
    classDef dash fill:#ccf,stroke:#333,stroke-width:2px;
    classDef view fill:#ff9,stroke:#333,stroke-width:2px;
    classDef success fill:#b3ffb3,stroke:#009933,stroke-width:2px;
    classDef danger fill:#ffb3b3,stroke:#cc0000,stroke-width:2px;
    classDef db fill:#eee,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;
    
    class A auth;
    class B dash;
    class C,D,F,G,H view;
    class K success;
    class J danger;
    class L db;
```
