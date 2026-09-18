import { Router } from 'express';
import * as usuarioCtrl from './usuario.controller.js';

export const usuarioRouter = Router();

usuarioRouter.get('/', usuarioCtrl.listarUsuarios);
usuarioRouter.get('/:id', usuarioCtrl.obtenerUsuario);
usuarioRouter.post('/', usuarioCtrl.crearUsuario);
usuarioRouter.put('/:id', usuarioCtrl.actualizarUsuario);
usuarioRouter.delete('/:id', usuarioCtrl.eliminarUsuario);
