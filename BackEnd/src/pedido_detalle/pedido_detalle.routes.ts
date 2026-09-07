import { Router } from 'express';
import * as pedidoDetalleCtrl from './pedido_detalle.controller.js';

// El alta de PedidoDetalle ocurre exclusivamente dentro de pedido.controller
// (gestionarPedido, CUU07). Estos endpoints son de solo lectura.

// Se anida bajo /api/pedidos/:pedidoId/detalle (ver app.ts)
export const detallePorPedidoRouter = Router({ mergeParams: true });
detallePorPedidoRouter.get('/', pedidoDetalleCtrl.listarDetallePorPedido);

// Se anida bajo /api/partidas/:partidaId/pedidos (ver app.ts). Usado por
// GUI-19 "Detalle de Partida": que pedidos consumen esta partida.
export const detallePorPartidaRouter = Router({ mergeParams: true });
detallePorPartidaRouter.get('/', pedidoDetalleCtrl.listarDetallePorPartida);
