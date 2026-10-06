import { Router } from 'express';
import * as usuarioCtrl from './usuario.controller.js';
import { verificarRol } from '../auth/auth.middleware.js';

export const usuarioRouter = Router();

// verificarToken ya se aplica de forma global en app.ts antes de llegar aca.

// IMPORTANTE: '/solicitudes' va ANTES de '/:id', si no Express lo toma como un id.
usuarioRouter.get('/solicitudes', verificarRol('administrador'), usuarioCtrl.listarSolicitudes);
usuarioRouter.patch('/:id/estado', verificarRol('administrador'), usuarioCtrl.cambiarEstado);

usuarioRouter.get('/', usuarioCtrl.listarUsuarios);
usuarioRouter.get('/:id', usuarioCtrl.obtenerUsuario);
usuarioRouter.post('/', verificarRol('administrador'), usuarioCtrl.crearUsuario);
usuarioRouter.put('/:id', verificarRol('administrador'), usuarioCtrl.actualizarUsuario);
usuarioRouter.delete('/:id', verificarRol('administrador'), usuarioCtrl.eliminarUsuario);