import type { Request, Response, NextFunction } from 'express';
import { compare, hash } from 'bcryptjs';
import dayjs from 'dayjs';

import { mailHelper, prisma, userHelper, auth } from '../helpers/index.ts';
import {  OTP_VALIDITY, SALT_ROUNDS } from '../config/index.ts';
import { generateOtp } from '../utils/formatter.ts';
import {
	SIGNUP_SUCCESS,
	EMAIL_EXISTS,
	EMAIL_EXISTS_EXCEPTION,
	USER_DOESNT_EXISTS,
	USER_DOESNT_EXISTS_EXCEPTION,
	RESENT_OTP_SUCCESS,
	INVALID_OTP,
	INVALID_OTP_EXCEPTION,
	VERIFY_SUCCESS,
	SIGNIN_SUCCESS,
	INCORRECT_PASS,
	INCORRECT_PASS_EXCEPTION,
	ACCOUNT_NOT_VERIFIED,
	ACCOUNT_NOT_VERIFIED_EXCEPTION,
	PASSWORD_UPDATE_SUCCESS
} from '../messages.ts';
import type { TTokenPayload } from '../types/index.d.ts';

/**
 * Sign Up user
 * 
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const signup = async (req: Request, res: Response, next: NextFunction) => {
  const request = req.body;
  try {
		const email = request?.email?.trim();
		const pass = request?.password?.trim();
    const emailExists = await userHelper.checkIfUserExists(email, 'email');
    if (emailExists) { return res.response(EMAIL_EXISTS, {}, 409, EMAIL_EXISTS_EXCEPTION, false); }

		const password = await hash(pass, SALT_ROUNDS);

		const userDetails = {
			firstname: request?.firstname?.trim(),
			lastname: request?.lastname?.trim(),
			email: request?.email?.trim(),
			password,
			config: {
				create: { isVerified: false }
			},
		};

    const result = await prisma.user.create({ data: userDetails, include: { config: true } } );

		const { otp } = await saveOTP(result.id);
		await mailHelper.sendRegistrationOTP({ email: result.email, otp })
		return res.response(SIGNUP_SUCCESS, {}, 201);
  } catch (error: any) {
    return next({ error, statusCode: 500, message: error?.message });
  }
};

/**
 * Save the OTP in userOtp table
 * 
 * @param {number} userId 
 */
const saveOTP = async (userId: string) => {
  const otp = generateOtp();
	await prisma.userOtp.deleteMany({
		where: { userId }
	});
	const otpHash = await hash(otp, SALT_ROUNDS);
  const userOtpCreated = await prisma.userOtp.create({
		data: { userId, otpHash }
	});
  return { otp, userOtpCreated }; // Return plain OTP for sending via email/SMS
};

/**
 * Resend user registration OTP
 * 
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const resendRegistrationOtp = async (req: Request, res: Response, next: NextFunction) => {
	const { email } = req.body;
	try {
		const user = await prisma.user.findUnique({
			select: { id: true, email: true, firstname: true, lastname: true, fullname: true },
			where: { email }
		});		
		if (!user?.id) { return res.response(USER_DOESNT_EXISTS, {}, 401, USER_DOESNT_EXISTS_EXCEPTION, false); }

		const { otp } = await saveOTP(user?.id);
		await mailHelper.sendRegistrationOTP({ fullname: user.fullname, email: user.email, otp });
		return res.response(RESENT_OTP_SUCCESS);
	} catch (error: any) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

/**
 * Verify user registration OTP
 * 
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const verifyRegistrationOtp = async (req: Request, res: Response, next: NextFunction) => {
	const { email, otp } = req.body;
	try {
		const user = await prisma.user.findUnique({
			select: {
				id: true,
				email: true,
				fullname: true,
				otps: {
					select: { id: true, otpHash: true },
					take: 1,
					orderBy: { createdAt: 'desc' },
					where: {
						updatedAt: { gt: dayjs().subtract(OTP_VALIDITY, 'minutes').toDate() } 
					}
				}
			},
			where: {
				email,
				config: { isVerified: false },
			},
		})
		const userOtp = user?.otps?.[0];
		if (!user?.id || !userOtp?.otpHash) { return res.response(INVALID_OTP, {}, 400, INVALID_OTP_EXCEPTION, false); }

		const isValid = await compare(otp?.trim(), userOtp?.otpHash);
		if (!isValid) { return res.response(INVALID_OTP, {}, 400, INVALID_OTP_EXCEPTION, false); }

		const result = await prisma.$transaction(async (txn) => {
			await txn.userConfig.update({ where: { userId: user.id }, data: { isVerified: true }});
			await txn.userOtp.deleteMany({ where: { userId: user.id } });
		});

		await mailHelper.sendRegistrationMail(user);
		return res.response(VERIFY_SUCCESS);

	} catch (error: any) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

/**
 * Validate user credentials
 * 
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const signin = async (req: Request, res: Response, next: NextFunction) => {
	const request = req.body;
	request.password = request?.password?.trim();
	request.email = request?.email?.trim().toLowerCase();

	try {
		const user = await prisma.user.findUnique({
			select: {
				id: true, email: true, password: true, firstname: true, lastname: true, fullname: true,
				config: { select: { userId: true, isVerified: true }  }
			},
			where: { email: request.email }
		})
		if (!user?.id) { return res.response(USER_DOESNT_EXISTS, {}, 401, USER_DOESNT_EXISTS_EXCEPTION, false); }
		if (!user.config?.isVerified) { return res.response(ACCOUNT_NOT_VERIFIED, {}, 403, ACCOUNT_NOT_VERIFIED_EXCEPTION, false); }

		let valid = await compare(request.password, user.password);
		if (!valid) { return res.response(INCORRECT_PASS, {}, 401, INCORRECT_PASS_EXCEPTION, false); }
		const userData: TTokenPayload = {
			id: user.id,
			fullname: user.fullname,
			email: user.email,
		}
		const token = await auth.signToken(userData);
		return res.response(SIGNIN_SUCCESS, { user: userData, token });
	} catch (error: any) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

/**
 * API to change user password
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const changePassword = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { currentPassword, newPassword } = req.body, userId = req.userId;
		const user = await prisma.user.findUnique({
			select: { id: true, email: true, password:  true },
			where: { id: req.userId },
		});
		if (!user?.id) { return res.response(USER_DOESNT_EXISTS, {}, 401, USER_DOESNT_EXISTS_EXCEPTION, false); }
		let valid = await compare(currentPassword, user?.password);
		if (!valid) { return res.response(INCORRECT_PASS, {}, 401, INCORRECT_PASS_EXCEPTION, false); }

		const password = await hash(newPassword, SALT_ROUNDS);
		await prisma.user.update({ where: { id: user?.id }, data: { password } });
		return res.response(PASSWORD_UPDATE_SUCCESS);
	} catch (error: any) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

export default {
	signup,
	resendRegistrationOtp,
	verifyRegistrationOtp,
	signin,
	changePassword,
};