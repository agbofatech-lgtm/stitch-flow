export function getPagination(query: Record<string, any>) {
  const limit = Math.min(Number(query.limit) || 20, 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}
