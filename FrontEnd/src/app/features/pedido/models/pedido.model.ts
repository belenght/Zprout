export type TipoPedido = 'Hibrida' | 'Grano';
export type EstadoPedido = 'Aprobado para despacho' | 'Pendiente de stock';

export interface Pedido {
  nro_pedido: number;
  fecha_pedido: string;
  fecha_requerida: string;
  comprador: string;
  tipo_pedido: TipoPedido;
  estado_pedido: EstadoPedido;
}

export type PedidoPayload = Omit<Pedido, 'nro_pedido' | 'fecha_pedido' | 'estado_pedido'>;
