# Production Stage Boundary

Protected `productionStageService.ts` is SQL-coupled; **not edited**. SAC-3 `shop/stageMachine.ts` applies the **same codes and guards** in memory (start/complete/skip/reopen). Postgres path remains unmounted legacy.
