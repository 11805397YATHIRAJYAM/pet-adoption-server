import { validationResult } from 'express-validator';
import { createError } from '../utils/error.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join(', ');
    return next(createError(422, messages));
  }
  next();
};
