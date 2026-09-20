import { TipoDeSemilla } from './catalogos';
import { Partida } from './partida';

export type TipoPedido = 'hibrida' | 'grano';

// Espejo de BackEnd/src/pedido/pedido.entity.ts (EstadoPedido). Si el
// backend agrega un estado nuevo, agregarlo tambien aca.
export type EstadoPedido = 'Aprobado para despacho' | 'Pendiente de stock' | 'Despachado' | 'Cancelado';

// DTO que llega del backend (pedido.controller.ts)
export interface Pedido {
  id_pedido: number;
  nro_pedido: string;
  fecha_pedido: string;
  fecha_requerida: string;
  comprador: string;
  tipo: TipoPedido;
  estado_pedido: EstadoPedido;
}

// DTO que llega del backend (pedido_detalle.controller.ts / obtenerPedido)
export interface PedidoDetalle {
  id_pedido_detalle: number;
  tipo_semilla: TipoDeSemilla;
  cantidad_solicitada_kg: string;
  partida_asignada?: Partida;
  cantidad_asignada_bolsas?: number;
}

export interface DetallePedidoCompleto {
  pedido: Pedido;
  detalle: PedidoDetalle[];
}

// Body que espera POST /api/pedidos (CUU07)
export interface ItemPedido {
  tipo_semilla_id: number;
  cantidad_solicitada_kg: number;
}

export interface GestionarPedidoPayload {
  comprador: string;
  fecha_requerida: string;
  tipo: TipoPedido;
  items: ItemPedido[];
}

export interface ResultadoGestionarPedido {
  pedido: Pedido;
  stock_pendiente: boolean;
}

export interface ResultadoReintentar {
  pedido: Pedido;
  stock_pendiente: boolean;
}
