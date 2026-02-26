import type { Request, Response, NextFunction } from 'express';

import type { TApiResponse } from '../types/index.d.ts';


/**
 * Common response handler middleware that extends Express response object
 * with a custom response method for consistent API responses
 * 
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const responseHandler = (req: Request, res: Response, next: NextFunction) => {
  /**
   * Sends a standardized JSON response
   * 
   * @param {string} message - Response message describing the result
   * @param {object} [resultData={}] - Data to be returned in the response
   * @param {number} [statusCode=200] - HTTP status code (default: 200)
   * @param {string} [code] - Optional custom code for the response
   * @param {boolean} [success=true] - Indicates if the operation was successful
   * @returns {Response} The Express response object for chaining
   */
  res.response = <T = unknown>(
    message: string,
    resultData: object = {},
    statusCode: number = 200,
    code: string = '',
    success: boolean = true
  ): Response => {
    const payload: TApiResponse<T> = {
      success,
      message,
      code,
      resultData,
      statusCode,
    };
    return res.status(statusCode).json(payload);
  };
  next();
};

export default responseHandler;