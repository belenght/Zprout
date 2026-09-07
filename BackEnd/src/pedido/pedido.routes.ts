import { Router } from 'express';
import * as pedidoCtrl from './pedido.controller.js';

export const pedidoRouter = Router();

// CUU07 - "Gestionar pedido"
pedidoRouter.get('/', pedidoCtrl.listarPedidos);
pedidoRouter.get('/:id', pedidoCtrl.obtenerPedido);
pedidoRouter.post('/', pedidoCtrl.gestionarPedido);
