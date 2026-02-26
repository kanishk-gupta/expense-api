const { hashSync, compareSync } = require('bcrypt');
const {
  SALT_ROUNDS,
  EMAIL_VERIFICATION_OTP,
  APP_NAME,
  OTP_VALIDITY,
	PASS_RESET_OTP,
} = require('../../config');
const Auth = require('../middlewares/auth');
const dayjs = require('dayjs');

const { db } = require('../db');
const { userHelper, Mailer, mailHelper, subHelper } = require('../helpers');
const { generateOtp } = require('../utils');
const {
  EMAIL_EXISTS,
  EMAIL_EXISTS_EXCEPTION,
  SIGNUP_SUCCESS,
  ROLE_NOT_EXISTS,
  SIGNIN_SUCCESS,
	INVALID_OTP,
	INVALID_OTP_EXCEPTION,
	VERIFY_SUCCESS,
	USER_DOESNT_EXISTS,
	USER_DOESNT_EXISTS_EXCEPTION,
	INCORRECT_PASS,
	INCORRECT_PASS_EXCEPTION,
	ACCOUNT_NOT_VERIFIED,
	ACCOUNT_NOT_VERIFIED_EXCEPTION,
	RESENT_OTP_SUCCESS,
	RESET_CODE_SUCCESS,
	PASSWORD_UPDATE_SUCCESS,
	RESET_CODE_VERIFIED,
	INVITE_INVALID,
	INVITE_INVALID_EXCEPTION,
	PLAN_USER_LIMIT_EXCEED,
	PLAN_USER_LIMIT_EXCEED_EXCEPTION
} = require('../messages');
const {
	USER_ASSOCIATIONS: {
		ORGANIZATION_USER
	},
	SUBSCRIPTION_STATUS
} = require('../constants');

const { checkIfUserExists, fetchCurrentUserCount } = userHelper;
const { Op, where, col, fn } = db.Sequelize;

/**
 * Sign Up user
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const signup = async (req, res, next) => {
  const request = req.body;
	let invite;
  try {
		if (request?.source === 'invite') {
			invite = await checkIfValidInvite(request.email, request.token, request.type);
		}
    if (request?.source === 'invite' && !invite) { return res.response(INVITE_INVALID, {}, 410, INVITE_INVALID_EXCEPTION, false); }
		// TODO: Add check for max allowed user for an owner
		if (request?.source === 'invite' && invite) {
			const userCount = await fetchCurrentUserCount(invite?.inviteOwner?.id);
			const maxUsers = invite?.inviteOwner?.Subscriptions?.length ? invite?.inviteOwner?.Subscriptions[0]?.maxUsers : 0;
			if (userCount >= maxUsers) {
				return res.response(PLAN_USER_LIMIT_EXCEED, {}, 403, PLAN_USER_LIMIT_EXCEED_EXCEPTION, false);
			}
		}

    const emailExists = await checkIfUserExists(request.email, 'email');
    if (emailExists) { return res.response(EMAIL_EXISTS, {}, 409, EMAIL_EXISTS_EXCEPTION, false); }
    // const phoneExists = await checkIfUserExists(request.phone, 'phone');
    // if (phoneExists) { return res.response(PHONE_EXISTS, {}, 409, PHONE_EXISTS_EXCEPTION, false); }
    const password = await hashSync(request.password, SALT_ROUNDS);

    const role = await db.Roles.findOne({
      attributes: ['id'],
      where: { name: request.type }
    });
    if (!role) { return res.response(ROLE_NOT_EXISTS, {}, 400); }

    const user = {
      firstName: request.firstName.trim(),
      lastName: request.lastName ? request.lastName.trim() : null,
      email: request.email.trim(),
      phone: request?.phone ? request?.phone?.trim() : null,
      gender: request?.gender ? request?.gender?.trim() : null,
      password,
      dob: request.dob || null,
      roleId: role.id,
			isPrimaryAccount: request?.source === 'self',
			ownerId: request?.source === 'invite' && invite?.ownerId ? invite?.ownerId : null
    };
		let metadata;
		if (request?.planId) {
			metadata = {
				tentativePlan: {
					isFreemium: request?.isFreemium,
					planId: request?.planId,
					interval: request?.interval
				}
			};
		}

    const result = await db.Users.create(user);
		const { otp } = await saveOTP(result.id, EMAIL_VERIFICATION_OTP);

    await db.UserConfig.create({
			userId: result.id,
			isVerified: false,
			registrationSource: request.source,
			organizationName: request?.organizationName ? request?.organizationName.trim() : null,
			metadata
		});
		if (request?.source === 'invite' && invite) {
			await associationsByInvite(invite, result.id, result.fullName);
		}
    await sendRegistrationOTP({ fullName: result.fullName, email: user.email, otp });
    return res.response(SIGNUP_SUCCESS, {}, 201);
  } catch (error) {
    return next({ error, statusCode: 500, message: error?.message });
  }
};

/**
 * Creates user assoications based on invite and send invite acceptance email
 *
 * @param {Object} invite
 * @param {number} userId
 * @param {string} fullName
 * @returns {Promise<Object>}
 */
const associationsByInvite = async (invite, userId, fullName) => {
	try {
		const inviteMailData = {
			fullName: invite?.inviteOwner.fullName,
			inviteeName: fullName,
			email: invite?.inviteOwner?.email,
		};
		await invite.update({ status: 'accepted', userId });
		await db.UserAssociations.create({
			primaryUserId: invite?.ownerId,
			associatedUserId: userId,
			relationType: ORGANIZATION_USER,
			lastLoginAt: null,
		});
		await mailHelper.sendInviteAcceptanceMail(inviteMailData);
		return invite;
	} catch (error) {
		throw error;
	}
}

/**
 * Checks if invite is valid and not expired
 *
 * @param {string} email
 * @param {string} token
 * @param {string} role
 * @returns {Promise<Object>}
 */
const checkIfValidInvite = async (email, token, role) => {
	try {
		return await db.Invites.findOne({
			attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'ownerId', 'token', 'sentById', 'status', 'expiryDate'],
			where: {
				email,
				token,
				role,
				expiryDate: { [Op.gte]: dayjs().toDate() },
				status: 'pending',
			},
			include: {
				model: db.Users,
				as: 'inviteOwner',
				required: true,
				attributes: ['id', 'fullName', 'firstName', 'lastName', 'email'],
				include: {
					model: db.Subscriptions,
					required: true,
					attributes: ['id', 'userId', 'planId', 'maxUsers', 'status'],
					where: { status: SUBSCRIPTION_STATUS.ACTIVE },
				}
			},
			subQuery: false
		});
	} catch (error) {
		throw error;
	}
};

/**
 * Save the OTP in userOtps table
 * 
 * @param {number} userId 
 * @param {string} otpType 
 * @returns {Object}
 */
const saveOTP = async (userId, otpType) => {
  const otp = generateOtp();
  const userOtpCreated = await db.UserOtps.create({ userId, otp, otpType });

  return { otp, userOtpCreated }; // Return plain OTP for sending via email/SMS
};


/**
 * Verify user registration OTP
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyRegistrationOtp = async (req, res, next) => {
	const request = req.body;
	try {
		const user = await db.Users.findOne({
			attributes: ['id', 'email', 'firstName', 'lastName', 'fullName'],
			where: { email: request.email },
			include: [{
				model: db.UserOtps,
				attributes: ['id', 'otp', 'otpType', 'updatedAt'],
				where: {
					otpType: EMAIL_VERIFICATION_OTP,
					updatedAt: { [Op.gte]: dayjs().subtract(OTP_VALIDITY, 'minutes').toDate() } // OTP_VALIDITY
				},
				required: true,
				separate: true, // Fetch associated records in a separate query
				limit: 1, // Limit to 1 record
			},
			{
				model: db.UserConfig,
				attributes: ['id', 'userId', 'isVerified', 'metadata'],
				where: { isVerified: false }
			},
			{
				model: db.Roles,
				attributes: ['name', 'isSuperAdmin'],
				required: true,
				include: {
					model: db.Permissions,
					as: 'permissions',
					required: true,
					attributes: ['id', 'key'],
					through: { attributes: [] },
				}
			}],
		});

		if (!user?.UserOtps?.length) { return res.response(INVALID_OTP, {}, 401, INVALID_OTP_EXCEPTION, false); }
		user.dataValues.UserOtps = user?.UserOtps[0];
		const valid = await compareSync(request.otp, user.dataValues.UserOtps.otp);
		// return res.json({ user });
		if (!valid) { return res.response(INVALID_OTP, {}, 401, INVALID_OTP_EXCEPTION, false); }

		await db.UserConfig.update({ isVerified: true }, { where: { userId: user.id } });
		await db.UserProgress.create({ userId: user.id, currentXP: 0 });
		await db.UserOtps.destroy({ where: { id: user.dataValues.UserOtps.id } });

		const { userData, token } = await userHelper.prepareAccessToken(user);

		await sendRegistrationMail(user);
		return res.response(VERIFY_SUCCESS, { user: userData, token });

	} catch (error) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

/**
 * Resend user registration OTP
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const resendRegistrationOtp = async (req, res, next) => {
	const { email } = req.body;
	try {
		const user = await db.Users.findOne({
			attributes: ['id', 'email', 'firstName', 'lastName'],
			where: { email },
		});

		if (!user?.id) { return res.response(USER_DOESNT_EXISTS, {}, 401, USER_DOESNT_EXISTS_EXCEPTION, false); }
		const { otp } = await saveOTP(user.id, EMAIL_VERIFICATION_OTP);

		await sendRegistrationOTP({ fullName: user.fullName, email: user.email, otp });
		return res.response(RESENT_OTP_SUCCESS);

	} catch (error) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

/**
 * Validate user credentials
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const signin = async (req, res, next) => {
	const request = req.body;
	request.password = request?.password?.trim();
	request.email = request?.email?.trim().toLowerCase();

	try {
		const user = await db.Users.findOne({
			attributes: [ 'id', 'firstName', 'lastName', 'email', 'password', 'fullName', 'isActive', 'isPrimaryAccount', 'ownerId'],
			where: {
				[Op.or]: [
					where(fn('LOWER', col('email')), request.email),
					where(fn('LOWER', col('username')), request.email),
				],
				isActive: true
			},
			include: [{
				model: db.UserConfig,
				attributes: ['isVerified', 'metadata'],
				required: true,
			}, {
				model: db.Roles,
				attributes: ['name', 'isSuperAdmin'],
				required: true,
				include: {
					model: db.Permissions,
					as: 'permissions',
					required: true,
					attributes: ['id', 'key'],
					through: { attributes: [] },
				}
			}],
		});
		if (!user?.id) { return res.response(USER_DOESNT_EXISTS, {}, 401, USER_DOESNT_EXISTS_EXCEPTION, false); }

		const ownerId = !user?.isPrimaryAccount && user?.ownerId ? user?.ownerId : user?.id;
		const attributes = ['id', 'userId', 'planId', 'name', 'status', 'isFreemium', 'interval'];
		const subscription = await subHelper.fetchActiveSubscription(ownerId, attributes);
		user.dataValues.subscription = subscription;

		let valid = await compareSync(request.password, user.password);
		if (!valid) { return res.response(INCORRECT_PASS, {}, 401, INCORRECT_PASS_EXCEPTION, false); }
		if (!user.UserConfig.isVerified) { return res.response(ACCOUNT_NOT_VERIFIED, {}, 403, ACCOUNT_NOT_VERIFIED_EXCEPTION, false); }

		await db.UserConfig.update(
			{ lastLoginAt: dayjs().toDate() },
			{ where: { userId: user?.id } }
		);
		const { userData, token } = await userHelper.prepareAccessToken(user);
		return res.response(SIGNIN_SUCCESS, { user: userData, token });
	} catch (error) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};



/**
 * Generate and send OTP on forgot password
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const forgotPassword = async (req, res, next) => {
	const { email } = req.body;
	try {
		const user = await db.Users.findOne({
			attributes: ['id', 'email', 'firstName', 'lastName'],
			where: { email },
		});

		if (!user?.id) { return res.response(USER_DOESNT_EXISTS, {}, 401, USER_DOESNT_EXISTS_EXCEPTION, false); }

		const { otp } = await saveOTP(user.id, PASS_RESET_OTP);
		await sendForgotPasswordOTP({ fullName: user.fullName, email: user.email, otp });
		return res.response(RESET_CODE_SUCCESS);
	} catch (error) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

/**
 * API to verify reset password OTP
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const verifyResetOtp = async (req, res, next) => {
	try {
		const { email, otp } = req.body;

		const user = await db.Users.findOne({
			attributes: ['id', 'email', 'firstName', 'lastName'],
			where: { email },
			include: {
				model: db.UserOtps,
				attributes: ['id', 'otp', 'otpType', 'updatedAt'],
				where: {
					otpType: PASS_RESET_OTP,
					updatedAt: { [Op.gte]: dayjs().subtract(OTP_VALIDITY, 'minutes').toDate() } // OTP_VALIDITY
				},
				required: true,
				limit: 1, // Limit to 1 record
			},
		});
		
		if (!user?.UserOtps?.length) { return res.response(INVALID_OTP, {}, 401, INVALID_OTP_EXCEPTION, false); }
		user.dataValues.UserOtps = user?.UserOtps[0];
		
		const valid = await compareSync(otp, user.dataValues.UserOtps.otp);
		
		if (!valid) { return res.response(INVALID_OTP, {}, 401, INVALID_OTP_EXCEPTION, false); }

		return res.response(RESET_CODE_VERIFIED);
	} catch (error) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

/**
 * API to reset user password
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const resetPassword = async (req, res, next) => {
	try {
		const { email, otp, password } = req.body;

		const user = await db.Users.findOne({
			attributes: ['id', 'email', 'firstName', 'lastName'],
			where: { email },
			include: {
				model: db.UserOtps,
				attributes: ['id', 'otp', 'otpType', 'updatedAt'],
				where: {
					otpType: PASS_RESET_OTP,
					updatedAt: { [Op.gte]: dayjs().subtract(OTP_VALIDITY, 'minutes').toDate() } // OTP_VALIDITY
				},
				required: true,
				separate: true, // Fetch associated records in a separate query
				limit: 1, // Limit to 1 record
			},
		});
		
		if (!user?.UserOtps?.length) { return res.response(INVALID_OTP, {}, 401, INVALID_OTP_EXCEPTION, false); }
		user.dataValues.UserOtps = user?.UserOtps[0];
		
		const valid = await compareSync(otp, user.dataValues.UserOtps.otp);
		
		if (!valid) { return res.response(INVALID_OTP, {}, 401, INVALID_OTP_EXCEPTION, false); }

    const passHash = await hashSync(password, SALT_ROUNDS);
		await db.Users.update({ password: passHash }, { where: { id: user.id } });
		await db.UserOtps.destroy({ where: { id: user.dataValues.UserOtps.id } });
		return res.response(PASSWORD_UPDATE_SUCCESS);
	} catch (error) {
		return next({ error, statusCode: 500, message: error?.message });
	}
};

/**
 * Send registration email to user
 * 
 * @param {Object} mailData 
 */
const sendRegistrationOTP = async (mailData) => {
	try {
		const mailer = new Mailer();

		let mailText = `Welcome to ${APP_NAME}. Confirm your email address. Your confirmation code is ${mailData.otp}, and is valid for ${OTP_VALIDITY} minutes.`;

		let mailHtml = `Welcome to ${APP_NAME}.<br/>
										Confirm your email address.<br/><br/>
										Your confirmation code is <b>${mailData.otp}</b>, and is valid for ${OTP_VALIDITY} minutes.<br/>`;

		const mailDetails = {
			to: mailData.email,
			subject: APP_NAME + ' confirmation code : ' + mailData.otp, // Subject line
			text: mailText, // plain text body
			html: mailHtml, // html body
			priority: "high",
			useTemplate: true,
			sendBCC: false,
		};
		return await mailer.sendMail(mailDetails);
	} catch (error) {
		console.log("ERROR in sendRegistrationEmail : ", error);
		throw error;
	}
};

/**
 * Send registration email to user
 * 
 * @param {Object} mailData 
 */
const sendRegistrationMail = async (mailData) => {
	try {
		const mailer = new Mailer();
		const fullname = `${mailData.firstName} ${mailData.lastName}`.trim();

		let mailText = `Hii  ${fullname} \nWelcome to ${APP_NAME}.\nStart you journey as user by setting up your profile and start earning money.`;

		let mailHtml = `Dear ${fullname}<br/>
										Welcome to ${APP_NAME}.<br/>
										Start you exciting journey with ${APP_NAME}.<br/>`;

		const mailDetails = {
			to: mailData.email,
			subject: `Welcome to ${APP_NAME}`, // Subject line
			text: mailText, // plain text body
			html: mailHtml, // html body
			priority: "high",
			useTemplate: true,
			sendBCC: false,
		};
		return await mailer.sendMail(mailDetails);
	} catch (error) {
		console.log("ERROR in sendRegistrationEmail : ", error);
		throw error;
	}
};

/**
 * Send forgot password OTP to user
 * 
 * @param {Object} mailData
 * @param {string} mailData.otp
 * @param {string} mailData.fullName
 * @param {string} mailData.email
 */
const sendForgotPasswordOTP = async (mailData) => {
	try {
		const mailer = new Mailer();

		let mailText = `Your forgot password OTP is ${mailData.otp}, and is valid for ${OTP_VALIDITY} minutes.`;

		let mailHtml = `Dear ${mailData.fullName}<br/>
		Your forgot password OTP is <b>${mailData.otp}</b>, and is valid for ${OTP_VALIDITY} minutes.<br/>`;

		const mailDetails = {
			to: mailData.email,
			subject: `${APP_NAME} | OTP to forgot password : ${mailData.otp}`, // Subject line
			text: mailText, // plain text body
			html: mailHtml, // html body
			priority: "high",
			useTemplate: true,
			sendBCC: false,
		};
		return await mailer.sendMail(mailDetails);
	} catch (error) {
		console.log("ERROR in sendForgotPasswordOTP : ", error);
		throw error;
	}
};

module.exports = {
  signup,
  signin,
	verifyRegistrationOtp,
	resendRegistrationOtp,
	forgotPassword,
	resetPassword,
	verifyResetOtp,
}
