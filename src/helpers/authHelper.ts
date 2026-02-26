import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { SECRET, TOKEN_EXPIRY } from '../config/index.ts';
import type { TTokenPayload } from "../types/index.d.ts";


/**
 * Generates an authorization token for the given user payload
 *
 * @param {TTokenPayload} payload
 * @param {string?} tokenTime
 */
const signToken = (payload: TTokenPayload, tokenTime: SignOptions['expiresIn'] = TOKEN_EXPIRY) => {
  return jwt.sign(payload, SECRET as Secret, { expiresIn: tokenTime });
};

/**
 * Verify the JWT token
 *
 * @param {string} token
 */
const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET);
};

export default {
  signToken,
  verifyToken,
};