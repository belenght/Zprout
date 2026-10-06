import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authCtrl from './auth.controller.js';

export const authRouter = Router();

// Limite mas estricto para el registro publico (el global de app.ts es 300/15min).
const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de registro, proba mas tarde.' },
});

// Login (GUI-01).
authRouter.post('/login', authCtrl.login);

// Registro (GUI-02). Publicos: viven en /api/auth porque verificarToken se
// aplica despues de este router en app.ts.
authRouter.get('/roles-registro', authCtrl.rolesParaRegistro);
authRouter.post('/registro', registroLimiter, authCtrl.registro);