/**
 * Canonical domain types barrel.
 *
 * The single source of truth for StitchFlow domain types is
 * `src/shared/types/index.ts`. This barrel exists because large parts of the
 * app (components, config, data, module services) import from `../types` /
 * `./types` relative to `src/`.
 *
 * NOTE: This file was previously destroyed (overwritten with a copy of
 * `main.tsx`) during an interrupted automated edit. Restored as the re-export
 * barrel it was always meant to be. Do not define types here.
 */
export * from './shared/types';
