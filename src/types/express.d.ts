import { TTokenPayload } from './app.d.ts';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      user: TTokenPayload
    }
    interface Response {
      response: <T = unknown>(
        message: string,
        resultData?: object,
        statusCode?: number,
        code?: string,
        success?: boolean
      ) => Response;
    }
  }
}