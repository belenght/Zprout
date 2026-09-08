/** Corresponde a "PedidoXSemilla" del modelo de datos: detalle de cantidades por semilla en un pedido. */
export interface PedidoDetalle {
  nro_pedido: number;
  id_semilla: number;
  cantidad: number; // en bolsas de 20kg
}

export type PedidoDetallePayload = PedidoDetalle;
