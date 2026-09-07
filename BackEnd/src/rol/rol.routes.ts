import { Router } from 'express';
import * as rolCtrl from './rol.controller.js';

export const rolRouter = Router();

rolRouter.get('/', rolCtrl.listarRoles);
rolRouter.get('/:id', rolCtrl.obtenerRol);
rolRouter.post('/', rolCtrl.crearRol);
rolRouter.put('/:id', rolCtrl.actualizarRol);
rolRouter.delete('/:id', rolCtrl.eliminarRol);
