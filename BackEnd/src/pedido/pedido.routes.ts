import { Router } from 'express';
import * as pedidoCtrl from './pedido.controller.js';

export const pedidoRouter = Router();

// CUU07 - "Gestionar pedido"
pedidoRouter.get('/', pedidoCtrl.listarPedidos);
// 'demanda-curado' va ANTES de '/:id' para que Express no lo tome como un id.
pedidoRouter.get('/demanda-curado', pedidoCtrl.demandaCurado);
pedidoRouter.get('/:id', pedidoCtrl.obtenerPedido);
pedidoRouter.post('/', pedidoCtrl.gestionarPedido);
pedidoRouter.post('/:id/despachar', pedidoCtrl.despacharPedido);
pedidoRouter.post('/:id/cancelar', pedidoCtrl.cancelarPedido);
pedidoRouter.post('/:id/reintentar', pedidoCtrl.reintentarAsignacion);
