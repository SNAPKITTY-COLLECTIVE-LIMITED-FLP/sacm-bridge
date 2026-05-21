# SACM Bridge
## Project S — Fork 1: The Compatibility Layer
## SnapKitty Collective × SEIT | Sovereign AI Mesh

[![License](https://img.shields.io/badge/License-BSD_2--Clause-blue.svg)](LICENSE)
[![Pipeline](https://img.shields.io/badge/Pipeline-Fork_1_of_3-orange.svg)]()
[![Org](https://img.shields.io/badge/Org-SNAPKITTY--COLLECTIVE--LIMITED--FLP-black.svg)]()
[![Powered By](https://img.shields.io/badge/Powered_By-SACM_Mesh-brightgreen.svg)]()

> *"The switching cost is near zero. That is by design."*

---

## What is the Bridge?

The SACM Bridge is the entry point to sovereign infrastructure.

It accepts any legacy project — any format, any platform — and imports it into the
**Stochastic Autonomous Compute Mesh (SACM)**. One POST request. Zero friction.

You don't need to restructure your data. You don't need to rewrite your pipeline.
You hand the Bridge your project. The Bridge hands it to the mesh.

---

## The Migration Pipeline

```
YOUR LEGACY PROJECT
        │
        ▼
POST /api/gateway/bridge      ← You are here
        │  Axiom Filter — security scan
        │  SACM ID assigned
        │  WORM-sealed import event
        ▼
   sacmId returned
        │
        ▼
POST /api/gateway/optimizer   → WORM-Causal Consensus
        │
        ▼
POST /api/gateway/sovereign   → SEIT Charter + Immutable Ledger
        │
        ▼
   Participant Record
   seitCertification: "observer" | "sovereign" | "igneous"
```

---

## Quick Start

```bash
# Import any legacy project
curl -X POST https://collectivekitty.com/api/gateway/bridge \
  -H "Content-Type: application/json" \
  -d '{
    "id": "your-legacy-project-id",
    "name": "My Project",
    "source": "github",
    "data": { "your": "project data" }
  }'

# Response
{
  "sacmId": "sacm_abc123...",
  "status": "imported",
  "nextStep": "POST /api/gateway/optimizer"
}
```

---

## Security

All payloads pass through the **Axiom Filter** before touching the mesh.
The following are rejected at the gate:
- Credentials, secrets, API keys, bearer tokens
- PII (SSN, credit card data)
- Vault and infrastructure secrets

The Bridge POST endpoint is public — no auth required to import.
All audit and retrieval endpoints require authentication.

---

## Implementation

Full implementation: [SNAPKITTYWEST/DEVFLOW-FINANCE](https://github.com/SNAPKITTYWEST/DEVFLOW-FINANCE)
Core library: `collectivekitty/lib/magma/bridge.ts`
API endpoint: `collectivekitty/pages/api/gateway/bridge.ts`

---

## Project S Forks

| Fork | Repo | Role |
|------|------|------|
| 1 | **sacm-bridge** (this repo) | Compatibility layer |
| 2 | [sacm-optimizer](https://github.com/SNAPKITTY-COLLECTIVE-LIMITED-FLP/sacm-optimizer) | WORM-Causal Consensus |
| 3 | [sacm-sovereign](https://github.com/SNAPKITTY-COLLECTIVE-LIMITED-FLP/sacm-sovereign) | SEIT Charter + Immutable Ledger |

---

## License

[BSD 2-Clause](LICENSE) — Copyright (c) 2026, Ahmad Ali Parr & Jessica Lee Westerhoff / SnapKitty Collective / SNAPKITTY COLLECTIVE LIMITED (FLP)

*© 2026 Ahmad Ali Parr & Jessica Lee Westerhoff / SnapKitty Collective. All Rights Reserved.*
*Written by Claude Sonnet 4.6 — Anthropic*
