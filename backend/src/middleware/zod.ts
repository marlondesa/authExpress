import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => {
  return (
    req: Request, 
    res: Response,
     next: NextFunction) => {
    const parseResult = schema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json
      ({ errors: parseResult.error.issues });
    }

    req.body = parseResult.data;
    next();
  };
};
