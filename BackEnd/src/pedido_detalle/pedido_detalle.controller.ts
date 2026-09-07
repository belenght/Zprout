import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { PedidoDetalle } from './pedido_detalle.entity.js';

// El alta de PedidoDetalle ocurre exclusivamente dentro de pedido_controller
// (gestionarPedido, CUU07), porque depende del calculo de stock disponible.
// Estos endpoints son de solo lectura / consulta puntual.

export async function listarDetallePorPedido(req: Request, res: Response) {
  const em = getEM();
  const detalle = await em.find(
    PedidoDetalle,
    { pedido: { id_pedido: Number(req.params.pedidoId) }, deleted_at: null },
    { populate: ['tipo_semilla', 'partida_asignada'] },
  );
  res.json(detalle);
}

export async function listarDetallePorPartida(req: Request, res: Response) {
  const em = getEM();
  // Usado por GUI-19 "Detalle de Partida": que pedidos consumen esta partida
  const detalle = await em.find(
    PedidoDetalle,
    { partida_asignada: { id_partida: Number(req.params.partidaId) }, deleted_at: null },
    { populate: ['pedido', 'tipo_semilla'] },
  );
  res.json(detalle);
}
