import { Router } from 'express';
import * as pedidoCtrl from './pedido.controller.js';

export const pedidoRouter = Router();

// CUU07 - "Gestionar pedido"
pedidoRouter.get('/', pedidoCtrl.listarPedidos);
pedidoRouter.get('/:id', pedidoCtrl.obtenerPedido);
pedidoRouter.post('/', pedidoCtrl.gestionarPedido);
pedidoRouter.post('/:id/despachar', pedidoCtrl.despacharPedido);
pedidoRouter.post('/:id/cancelar', pedidoCtrl.cancelarPedido);
pedidoRouter.post('/:id/reintentar', pedidoCtrl.reintentarAsignacion);
