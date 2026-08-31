/**
 * Anti-corruption aliases (ADR-003 / ADR-010).
 * FACT of existing UI/AppContext aliases — extracted, not invented.
 * Do not treat aliases as a second measurement system.
 */

export const MEASUREMENT_ALIASES: Record<string, readonly string[]> = {
  bust: ['bust', 'chest'],
  chest: ['chest', 'bust'],
  sleeve: ['sleeve', 'sleeveLength', 'sleeve_length'],
  sleeveLength: ['sleeveLength', 'sleeve', 'sleeve_length'],
  ankle: ['ankle', 'aroundAnkle'],
  aroundAnkle: ['aroundAnkle', 'ankle'],
  backLength: ['backLength', 'back_length'],
  bustSpan: ['bustSpan', 'bust_span'],
  armholeDepth: ['armholeDepth', 'armhole_depth'],
  aroundWrist: ['aroundWrist', 'wrist', 'wristCircumference', 'wrist_circumference'],
  trouserLength: ['trouserLength', 'trouser_length'],
  skirtLength: ['skirtLength', 'skirt_length'],
  fullLength: ['fullLength', 'full_length'],
};

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

export function readAliasedNumber(
  source: Record<string, unknown> | null | undefined,
  canonical: string
): number | undefined {
  if (!source) return undefined;
  const nested =
    source.measurements && typeof source.measurements === 'object'
      ? (source.measurements as Record<string, unknown>)
      : null;
  const names = MEASUREMENT_ALIASES[canonical] || [canonical];
  for (const name of names) {
    const nestedValue = nested ? asNumber(nested[name]) : undefined;
    if (nestedValue !== undefined) return nestedValue;
    const top = asNumber(source[name]);
    if (top !== undefined) return top;
  }
  return undefined;
}
