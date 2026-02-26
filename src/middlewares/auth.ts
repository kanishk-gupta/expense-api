import jwt, { type Secret, type VerifyErrors } from "jsonwebtoken";

import { SECRET } from '../config/index.ts';
import type { Request, Response, NextFunction } from 'express';
import type { TTokenPayload } from '../types/index.d.ts';
import { INVALID_TOKEN, INVALID_TOKEN_EXCEPTION, ACCESS_DENIED } from '../messages.ts';

/**
 * Check if request have a valid access token
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const checkToken = (req: Request, res: Response, next: NextFunction) => {
	// req.header_sub_domain = (req.headers['x-sub-domain'] !== undefined) ? req.headers['x-sub-domain'] : '';

	if (req.method === 'OPTIONS') { return next(); }

	let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
	if (!token || Array.isArray(token)) { return res.response(ACCESS_DENIED, {}, 401, INVALID_TOKEN_EXCEPTION, false); }

	if (token.startsWith('Bearer ')) {
		token = token.slice(7, token.length); // Remove Bearer from string
	}
	/* verify(token as string, SECRET as string, (err: import('jsonwebtoken').VerifyErrors | null, decoded?: TPayload) => {
		if (err) {
			return res.response(INVALID_TOKEN, {}, 401, INVALID_TOKEN_EXCEPTION, false);
		} else {
			// req.accessToken = token;
			if (decoded) {
				req.userId = decoded.id;
				req.user = {
					id: decoded.id,
					fullname: decoded.fullname,
				};
			}
			next();
		}
	}); */
	jwt.verify(token, SECRET as Secret, (err: VerifyErrors | null, decoded) => {
		if (err) { console.log(err); return res.response(INVALID_TOKEN, {}, 401, INVALID_TOKEN_EXCEPTION, false); }

		decoded = decoded as TTokenPayload;
		// req.accessToken = token;
		req.userId = decoded?.id;
		req.user = {
			id: decoded?.id,
			fullname: decoded?.fullname,
			email: decoded?.email,
		};
		next();
	});
};


/* const refreshToken = async(token, userData, tokenTime) => {

	if (token.startsWith('Bearer ')) {
		token = token.slice(7, token.length); // Remove Bearer from string
	}
	return verify(token, SECRET, async(err, decoded) => {
		if (err) {
			return { status: 'error', message: 'expired-token' };
		} else {
			if (decoded.user_id == userData.user_id) {
				let newToken = await authorize(userData, tokenTime);
				return { status: 'success', token: newToken };
			} else {
				return json_encode({ status: 'error', message: 'mismatch-token' });
			}
		}
	});

}; */

export default {
	checkToken,
};