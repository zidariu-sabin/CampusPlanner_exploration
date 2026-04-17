import { NextFunction, Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';

import { HttpError } from '../utils/http-error.js';

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
): Response {
  if (error instanceof HttpError) {
    return response.status(error.status).json({ message: error.message });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      message: 'Validation failed.',
      issues: error.issues,
    });
  }

  if (error instanceof QueryFailedError) {
    if ((error as QueryFailedError & { driverError?: { constraint?: string } }).driverError?.constraint === 'meetings_no_room_overlap') {
      return response.status(409).json({ message: 'The selected room is already booked for that hour.' });
    }
  }

  console.error(error);
  return response.status(500).json({ message: 'Unexpected server error.' });
}

