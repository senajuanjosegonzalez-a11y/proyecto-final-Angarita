# Diagrama de arquitectura

```mermaid
flowchart TB
    C[Cliente / Frontend]

    subgraph GW["API Gateway · Node.js · :3000"]
        G[Solo enruta]
    end

    subgraph AU["ms-usuarios · Spring Boot · :8080"]
        A1["/api/usuarios/registrar"]
        A2["/api/usuarios/login"]
        A3["/api/usuarios/perfil"]
        ADB[(SQLite: usuarios.db)]
    end

    subgraph PR["ms-productos · Node.js · :3001"]
        P1["/productos (JWT)"]
        P2["/internal/productos/:id"]
        PDB[(SQLite: productos.db)]
    end

    subgraph CO["ms-compras · Node.js · :3002"]
        CM1["/compras (JWT)"]
        CDB[(SQLite: compras.db)]
    end

    C -->|HTTP| G
    G -->|/api/usuarios/*| A2
    G -->|/api/productos/*| P1
    G -->|/api/compras/*| CM1

    A2 -->|genera JWT firmado| A2
    A1 --> ADB
    A2 --> ADB
    A3 --> ADB

    P1 --> PDB
    CM1 --> CDB
    CM1 -->|consulta precio y descuenta stock| P2
    P2 --> PDB

    style A2 fill:#f0e3da,stroke:#a2472f
    style CM1 fill:#f0e3da,stroke:#a2472f
    style P1 fill:#f0e3da,stroke:#a2472f
```

**Llave compartida:** `ms-usuarios`, `ms-productos` y `ms-compras` usan la
misma `JWT_SECRET`. Por eso productos y compras pueden verificar el token
sin llamar de vuelta a usuarios.
                    
                         ┌─────────────┐
                         │  FRONTEND   │
                         └──────┬──────┘
                                │
                         JWT usuario
                                │
                                ▼
                       ┌────────────────┐
                       │  API GATEWAY   │
                       │    :3000       │
                       └───────┬────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       ┌────────────┐   ┌────────────┐   ┌────────────┐
       │  USUARIOS  │   │ PRODUCTOS  │◄──│  COMPRAS   │
       │   :8080    │   │   :3001    │   │   :3002    │
       └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
             │                │                │
             ▼                ▼                ▼
       usuarios.db      productos.db       compras.db

                         ▲
                         │
                  API INTERNA
                  protegida
                  servicio ↔ servicio


                  La arquitectura conceptual queda:

                 ┌──────────────────┐
                 │   ms-usuarios    │
                 │                  │
                 │ Login            │
                 │     ↓            │
                 │ Genera JWT       │
                 └────────┬─────────┘
                          │
                          │ JWT
                          ▼
                    ┌───────────┐
                    │ Frontend  │
                    └─────┬─────┘
                          │
                    Authorization
                       Bearer JWT
                          │
                          ▼
                   ┌─────────────┐
                   │ API Gateway │
                   └──────┬──────┘
                          │
             ┌────────────┼────────────┐
             ▼            ▼            ▼
       ms-usuarios  ms-productos  ms-compras
                         │             │
                         │             │
                     verifica      verifica
                       JWT            JWT