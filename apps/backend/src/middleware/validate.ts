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

    req.body = result.data.body;
    req.query = result.data.query;
    req.params = result.data.params;
    next();
  };
}
