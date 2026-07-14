import { NextFunction, Request, Response } from 'express';
import { ZodObject, ZodError } from 'zod';

import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export const validate = (schema: ZodObject<any>) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // validate request body
      const parsed = await schema.parseAsync(req.body);

      req.body = { ...req.body, ...parsed };

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues[0]?.message || 'Validation failed';

        logger.error({
          msg: 'Validation error',
          errors: err.issues,
        });

        return next(AppError.badRequest(message));
      }

      next(err);
    }
  };
};

export const validateQuery =
  (schema: ZodObject<any>) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const message = result.error.issues[0].message;
      return next(AppError.badRequest(message));
    }
    Object.assign(req.query, result.data);

    next();
  };

export const validateId =
  (schema: ZodObject<any>) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      throw AppError.badRequest('Invalid user ID');
    }

    Object.assign(req.params, result.data);
    next();
  };
