# Data Authority Forensic Map

| Entity | Writer | Reader | localStorage | T2 | Backend | Authority |
|---|---|---|---|---|---|---|
| Customers (atelier) | AppContext | Orders/Studio | yes | **not mirrored** | unmounted | Split Class C |
| Customers (HTTP) | Customers.tsx | Clients screen | no | no | unmounted | Class C |
| Orders (Orders.tsx) | AppContext | Orders | yes | **mirror** `order` | unmounted | Class B |
| Orders (Board) | HTTP | ProductionBoard | no | no | unmounted | Class C |
| Measurement profiles | AppContext | Studio | yes | **mirror** live kind | none | Class B |
| MeasurementVersion | freeze APIs | Path C | no | append-only | none | Class D |
| Fabrics | AppContext | Materials | yes | **mirror** `material` | unused | Class A |
| Invoices | HTTP screen | Invoices | seed unused | **not mirrored** | unmounted | Class C |
| Production stages | local + HTTP mismatch | Orders/Board | on order | no | unmounted | Class C |
| Trusted artifacts | SAC-1 finalize | session + T2 | no | production entity | none | Class D |

**FACT:** AppContext `saveAppStorage` remains UI write. T2 `putLocalCanonical` is additive, no outbox enqueue.
