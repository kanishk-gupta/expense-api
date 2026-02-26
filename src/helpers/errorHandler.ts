import dayjs from 'dayjs';
import type { Response } from 'express';

import { COMMON_ERR_MSG } from '../config/index.ts';
import type { TApiResponse } from '../types/index.d.ts';
// const logger = require('./logger');
import logger from './logger.ts'

export class ErrorHandler extends Error {
	statusCode: number;
  errorCode?: string | undefined;
  error?: unknown;
  errorMessage?: string | undefined;

	constructor (statusCode: number, message: string, error?: unknown, errorCode?: string) {
		super(message);
		this.statusCode = statusCode ?? 500;
		this.message = message ?? COMMON_ERR_MSG;
		this.errorCode = errorCode ?? undefined;
		this.error = error;
		this.errorMessage = (error as { message?: string })?.message;
	};
}

/**
 * Handles errors by sending a JSON response with the error details.
 *
 * @param {ErrorHandler} err - The error object
 * @param {Response} res - The response object
 * @returns {Response} The JSON response with error details
 */
export const handleError = (err: ErrorHandler, res: Response) => {
	let { statusCode, message, error, errorCode, errorMessage } = err;

	console.log(dayjs().format("YYYY-MM-DD HH:mm:ss"), '::', err);
	logger.error(err);

	statusCode = statusCode ?? 500;
	message = message ?? COMMON_ERR_MSG;

	const payload: TApiResponse<unknown> = {
    success: false,
    message,
    code: errorCode,
    error: process.env.NODE_ENV === 'development' ? error : undefined,
    errorMessage,
    timeStamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

	return res.status(statusCode).json(payload);
};