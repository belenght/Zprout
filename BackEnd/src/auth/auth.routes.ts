import { Router } from 'express';
import * as authCtrl from './auth.controller.js';

export const authRouter = Router();

// Login (GUI-01).
authRouter.post('/login', authCtrl.login);
