# Data experience authority map

SER-F0 does **not** migrate. This map exists so later SER stages do not fight SAC.

```
CURRENT UI
├── AppContext / localStorage     product SoT for many rooms
├── HTTP unmounted CRUD           Clients, Production, Invoices
├── T2 IndexedDB                  SAC-2 mirror + outbox (default push blocked)
└── Authenticated /shop           SAC-3/4/5 — not consumed by screens
```

| Screen | Current UI data | T2 capable | `/shop` domain | Migration risk |
|---|---|---|---|---|
| Atelier Home | AppContext counts | mirror of orders/profiles | no home resource | low if stays derived |
| Clients | **HTTP `/customers`** | customer entity unused by SAC-2 | customers **yes** | **HIGH** — three populations |
| Measurements | AppContext live profiles | measurement repo | snapshots are **on orders**, not live profiles | HIGH semantic mix |
| Design | Studio + AppContext | design/production artifacts | trusted artifacts **yes** | HIGH if screens dump canvas blob |
| Production | **HTTP `/orders`** | not this board | stages **on shop orders** | HIGH |
| Orders | AppContext | SAC-2 ShopOrder projection **no outbox** | shop order **narrow shape** | HIGH blob vs `/shop` |
| Materials | AppContext | material repo | **deferred** | do not pull into SER-F6 |
| Invoices | HTTP | not mirrored | **deferred** | do not pull into SER-F6 |
| Reports | AppContext | no | **deferred** | derived only |
| Settings | mixed local + settings API | no | no | leave |
| Control | `/auth` `/control` | no | platform file store | leave |
| SAC-5 facade | unused by screens | yes | yes | Level 1 only |

**Rule for later SER:** restyle chrome without pointing Clients at unauthenticated `/customers`. Do not “fix” load errors by remounting `MOUNT_UNAUTHENTICATED_BUSINESS_ROUTES`.
