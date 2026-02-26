import { Router } from 'express';

import { authValidation } from '../validations/index.ts';
import { authCtrl } from '../controllers/index.ts';


const router = Router();

router.post('/signup', authValidation.signupValidation, authCtrl.signup);
router.post("/otp/verify", authValidation.verifyOtpValidation, authCtrl.verifyRegistrationOtp);
router.post("/otp/resend", authValidation.resendOtp, authCtrl.resendRegistrationOtp);
router.post("/signin", authValidation.signinValidation, authCtrl.signin);

export default router;