import { Router } from 'express';
import * as campoCtrl from './campo.controller.js';

export const campoRouter = Router();

campoRouter.get('/', campoCtrl.listarCampos);
campoRouter.get('/:id', campoCtrl.obtenerCampo);
campoRouter.post('/', campoCtrl.crearCampo);
campoRouter.put('/:id', campoCtrl.actualizarCampo);
campoRouter.delete('/:id', campoCtrl.eliminarCampo);
