/**
 * ATENCION: en la estructura de BackEnd que compartiste no existe todavia un
 * modulo `asignacion_pedido_partida` (ni entity ni controller ni routes).
 * Este modelo queda preparado para cuando agreguen ese endpoint en el backend;
 * mientras tanto, AsignacionPedidoPartidaService no tiene contra que pegarle.
 */
export interface AsignacionPedidoPartida {
  nro_pedido: number;
  nro_partida: number;
  cantidad_bolsas_asignadas: number;
}
