import { Router } from 'express';
import * as bitacoraCtrl from './bitacora.controller.js';
import { verificarRol } from '../auth/auth.middleware.js';

export const bitacoraRouter = Router();
bitacoraRouter.get('/', verificarRol('administrador'), bitacoraCtrl.listar);
