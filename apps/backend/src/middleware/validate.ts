import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/apiError';

export function validate(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      return next(
        new ApiError(400, 'VALIDATION_ERROR', result.error.issues[0]?.message || 'Invalid input')
      );
    }

    // Only overwrite the request parts the schema declares. Undeclared keys
    // must survive intact: a body-only schema (e.g. customer-scoped Phase
    // 14/15/16 routes) must not strip req.params, and a params-only schema
    // must not strip req.body.
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined) req.query = result.data.query;
    if (result.data.params !== undefined) req.params = result.data.params;
    next();
  };
}
