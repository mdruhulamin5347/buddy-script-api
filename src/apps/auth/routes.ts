import { Router } from 'express';
import { validate} from '@/middleware/validate';
import { AuthController } from '@/apps/auth/controllers';
import { ZLogin, ZRegister } from '@/apps/auth/validators';


const authRouter = Router();
const authController = new AuthController();

authRouter.post('/auth/login', validate(ZLogin), authController.login);
authRouter.post('/auth/register', validate(ZRegister), authController.register);
authRouter.post('/auth/refresh', authController.refreshToken);
authRouter.post('/auth/logout', authController.logout);

export default authRouter;