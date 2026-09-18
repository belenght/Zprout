import { Router } from 'express';
import * as usuarioCtrl from './usuario.controller.js';
import { verificarRol } from '../auth/auth.middleware.js';

export const usuarioRouter = Router();

// verificarToken ya se aplica de forma global en app.ts antes de llegar aca.
usuarioRouter.get('/', usuarioCtrl.listarUsuarios);
usuarioRouter.get('/:id', usuarioCtrl.obtenerUsuario);
usuarioRouter.post('/', verificarRol('administrador'), usuarioCtrl.crearUsuario);
usuarioRouter.put('/:id', verificarRol('administrador'), usuarioCtrl.actualizarUsuario);
usuarioRouter.delete('/:id', verificarRol('administrador'), usuarioCtrl.eliminarUsuario);