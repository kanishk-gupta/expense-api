export const PORT = process.env.PORT || 8000;
export const SECRET = process.env.SECRET || 'random_secret';
export const TOKEN_EXPIRY = '1d';
export const SALT_ROUNDS = 10;
export const OTP_VALIDITY = 30; // In minutes
export const EMAIL_VERIFICATION_OTP = 'email_verification';
export const PASS_RESET_OTP = 'password_reset';
export const SITE_URL = 'http://localhost:5000/';
export const APP_NAME = "Expense Tracker";
export const SMTP = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  user: 'dev.kanishk.gupta@gmail.com',
  pass: 'djxt vvdz xpgc acmj',
  fromEmail: 'dev.kanishk.gupta@gmail.com',
  fromAlias: 'Expense Tracker Team',
  adminEmail: ['dev.kanishk.gupta@gmail.com'],
};
export const COMMON_ERR_MSG = 'Something went wrong. Please try again later.';