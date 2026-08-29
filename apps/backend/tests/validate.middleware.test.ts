/**
 * validate.ts middleware — focused regression tests.
 *
 * Invariant (post-recovery fix): the middleware must ONLY overwrite the
 * request parts the schema actually declares.
 *
 *   Case A — schema declares `params`: req.params must be replaced with the
 *            validated/narrowed values (e.g. coerced types).
 *   Case B — schema omits a part (body-only or query-only schema): the
 *            original Express value for that part must survive intact.
 *            (This is what the Phase 14/15/16 customer-scoped routes rely on:
 *            they declare only `body`/`query` and must keep req.params.)
 */
import { z } from 'zod';
import { validate } from '../src/middleware/validate';
import { ApiError } from '../src/utils/apiError';

type ReqLike = {
  body: unknown;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
};

function runMiddleware(schema: z.ZodTypeAny, req: ReqLike) {
  let nextArg: unknown = undefined;
  let nextCalled = 0;
  const next = (err?: unknown) => {
    nextCalled += 1;
    nextArg = err;
  };
  const res = {} as never;
  validate(schema)(req as never, res, next as never);
  return { req, nextArg, nextCalled };
}

describe('validate middleware — part-preserving contract', () => {
  it('Case A: explicit params schema applies validated/narrowed params and preserves body', () => {
    const schema = z.object({
      params: z.object({ id: z.coerce.number(), workspaceId: z.string().min(1) }),
    });
    const { req, nextArg, nextCalled } = runMiddleware(schema, {
      body: { note: 'must survive a params-only schema' },
      query: { include: 'x' },
      params: { id: '42', workspaceId: 'ws-1' },
    });

    expect(nextCalled).toBe(1);
    expect(nextArg).toBeUndefined();
    // Narrowed/coerced params are applied.
    expect(req.params).toEqual({ id: 42, workspaceId: 'ws-1' });
    // Body and query are untouched (same reference — not re-written).
    expect(req.body).toEqual({ note: 'must survive a params-only schema' });
    expect(req.query).toEqual({ include: 'x' });
  });

  it('Case B: body-only schema preserves Express route params', () => {
    const schema = z.object({
      body: z.object({ amountCm: z.number().positive() }),
    });
    const { req, nextArg, nextCalled } = runMiddleware(schema, {
      body: { amountCm: 120 },
      query: {},
      params: { customerId: 'cust-1', id: 'design-9' },
    });

    expect(nextCalled).toBe(1);
    expect(nextArg).toBeUndefined();
    // Validated body is applied.
    expect(req.body).toEqual({ amountCm: 120 });
    // CRITICAL: params must NOT be clobbered by the fix-less implementation
    // (which set req.params = parsed.params === undefined).
    expect(req.params).toEqual({ customerId: 'cust-1', id: 'design-9' });
  });

  it('Case B: query-only schema preserves both body and params', () => {
    const schema = z.object({
      query: z.object({ limit: z.coerce.number().int().min(1).default(20) }),
    });
    const originalBody = { draft: true };
    const { req, nextCalled } = runMiddleware(schema, {
      body: originalBody,
      query: { limit: '5' },
      params: { customerId: 'cust-2' },
    });

    expect(nextCalled).toBe(1);
    expect(req.query).toEqual({ limit: 5 });
    expect(req.body).toBe(originalBody); // untouched reference
    expect(req.params).toEqual({ customerId: 'cust-2' });
  });

  it('failure path: invalid input rejects with ApiError(400, VALIDATION_ERROR)', () => {
    const schema = z.object({
      body: z.object({ amountCm: z.number().positive() }),
    });
    const { nextArg, nextCalled } = runMiddleware(schema, {
      body: { amountCm: -1 },
      query: {},
      params: { customerId: 'cust-1' },
    });

    expect(nextCalled).toBe(1);
    expect(nextArg).toBeInstanceOf(ApiError);
    expect((nextArg as ApiError).statusCode).toBe(400);
    expect((nextArg as ApiError).code).toBe('VALIDATION_ERROR');
  });
});
