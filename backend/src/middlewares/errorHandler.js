import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(statusCode).json({
      error: 'upload_error',
      message: error.message,
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
      details: error.details,
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'Unexpected server error',
  });
}
