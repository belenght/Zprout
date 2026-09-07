import { Router } from 'express';
import * as estimacionVentaCtrl from './estimacion_venta.controller.js';

export const estimacionVentaRouter = Router();

estimacionVentaRouter.get('/', estimacionVentaCtrl.listarEstimacionesVenta);
estimacionVentaRouter.post('/', estimacionVentaCtrl.crearEstimacionVenta);
estimacionVentaRouter.put('/:id', estimacionVentaCtrl.actualizarEstimacionVenta);
estimacionVentaRouter.delete('/:id', estimacionVentaCtrl.eliminarEstimacionVenta);
