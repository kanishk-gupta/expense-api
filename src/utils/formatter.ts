/**
 * Generate 6 digit random OTP
 *
 * @returns {string}
 */
export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/* const roundOffNumber = (value, precision = 2) => {
  return parseFloat(value.toFixed(precision));
}; */
