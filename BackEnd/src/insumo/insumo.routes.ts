import { Router } from 'express';
import * as insumoCtrl from './insumo.controller.js';

export const insumoRouter = Router();

insumoRouter.get('/', insumoCtrl.listarInsumos);
insumoRouter.get('/:id', insumoCtrl.obtenerInsumo);
insumoRouter.post('/', insumoCtrl.crearInsumo);
insumoRouter.put('/:id', insumoCtrl.actualizarInsumo);
insumoRouter.delete('/:id', insumoCtrl.eliminarInsumo);
