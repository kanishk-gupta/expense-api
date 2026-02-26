import { Router } from 'express';

import { authValidation } from '../validations/index.ts';
import { authCtrl } from '../controllers/index.ts';
import { auth } from '../middlewares/index.ts';

const router = Router();
router.use(auth.checkToken);

router.put("/password/change", authValidation.changePasswordValidation, authCtrl.changePassword);

export default router;