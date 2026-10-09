import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as usuarioCtrl from './usuario.controller.js';
import * as perfilCtrl from './perfil.controller.js';
import * as gestionCtrl from './gestion.controller.js';
import { verificarRol } from '../auth/auth.middleware.js';

export const usuarioRouter = Router();

// verificarToken ya se aplica de forma global en app.ts antes de llegar aca.

// "Mi perfil" (cualquier usuario logueado, sobre su propia cuenta). Va ANTES de
// '/:id' por la misma razon: si no, Express toma "me" como un id.
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, proba mas tarde.' },
});
usuarioRouter.get('/me', perfilCtrl.obtenerMiPerfil);
usuarioRouter.patch('/me', perfilCtrl.actualizarMiPerfil);
usuarioRouter.put('/me/password', passwordLimiter, perfilCtrl.cambiarMiPassword);
usuarioRouter.put('/me/foto', perfilCtrl.subirMiFoto);
usuarioRouter.delete('/me/foto', perfilCtrl.eliminarMiFoto);

// Gestion de usuarios (solo administrador). Tambien antes de '/:id'.
usuarioRouter.get('/gestion', verificarRol('administrador'), gestionCtrl.listar);
usuarioRouter.get('/gestion/:id', verificarRol('administrador'), gestionCtrl.detalle);
usuarioRouter.patch('/gestion/:id', verificarRol('administrador'), gestionCtrl.actualizar);
usuarioRouter.put('/gestion/:id/password', verificarRol('administrador'), passwordLimiter, gestionCtrl.restablecerPassword);
usuarioRouter.delete('/gestion/:id', verificarRol('administrador'), gestionCtrl.eliminar);

// IMPORTANTE: '/solicitudes' va ANTES de '/:id', si no Express lo toma como un id.
usuarioRouter.get('/solicitudes', verificarRol('administrador'), usuarioCtrl.listarSolicitudes);
usuarioRouter.patch('/:id/estado', verificarRol('administrador'), usuarioCtrl.cambiarEstado);

usuarioRouter.get('/', usuarioCtrl.listarUsuarios);
usuarioRouter.get('/:id', usuarioCtrl.obtenerUsuario);
usuarioRouter.post('/', verificarRol('administrador'), usuarioCtrl.crearUsuario);
usuarioRouter.put('/:id', verificarRol('administrador'), usuarioCtrl.actualizarUsuario);
usuarioRouter.delete('/:id', verificarRol('administrador'), usuarioCtrl.eliminarUsuario);