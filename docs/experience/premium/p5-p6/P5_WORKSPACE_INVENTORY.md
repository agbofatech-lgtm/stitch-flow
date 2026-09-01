# Workspace Inventory

| Room | Type | Primary action | States | Treatment |
|---|---|---|---|---|
| Atelier Home | Standard | Open client studio / orders | empty queue | Already P3 grammar |
| Customers | Standard | Add Customer | loading/error/empty/ready | PageHeader h2 + primitives |
| Orders | Standard | New Order | empty/ready | PageHeader h2 |
| Production | Focus | stage actions | loading/error/empty/ready | skeleton + retry |
| Materials | Standard | Add Material | empty/ready | PageHeader h2 |
| Invoices | Data | New Invoice | loading/error/empty/ready | primitives |
| Reports | Data | navigate to rooms | empty blocks | header grammar; FeatureGate honest |
| Settings | Focus | Save profile | loading/saving/error/success | simulate copy honest |
| Design Studio | Canvas | internal | protected | frame only UNCHANGED internals |
| Control Center | Command | Sign in / load plane | error retry | structured API fields |
| Dashboard.tsx | dead vs shell | n/a | unused by StudioShell | NOT rebuilt |
