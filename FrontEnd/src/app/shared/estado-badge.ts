// Vocabulario cerrado de estados de Lote (ver BackEnd/src/estado/estado_nombres.ts,
// ESTADOS_LOTE). El front no debe inventar ni usar sinonimos: si el backend agrega
// un estado nuevo a esa lista, agregarlo tambien aca (cae en el default si no).

const CLASES_POR_ESTADO: Record<string, string> = {
  'Pendiente CC': 'bg-amber-100 text-amber-800',
  'En limpieza': 'bg-blue-100 text-blue-700',
  'Para curar': 'bg-gold-500/15 text-amber-800',
  'No apto': 'bg-red-100 text-red-700',
  'Venta como grano': 'bg-brand-100 text-brand-800',
  Descarte: 'bg-red-200 text-red-900',
  // Estados de Partida (ver BackEnd/src/estado/estado_nombres.ts, ESTADOS_PARTIDA)
  Envasado: 'bg-gold-500/15 text-amber-800',
  'Apto para comercializacion': 'bg-brand-100 text-brand-800',
  Rechazado: 'bg-red-100 text-red-700',
  // Estados de Pedido (ver BackEnd/src/pedido/pedido.entity.ts, EstadoPedido)
  'Aprobado para despacho': 'bg-brand-100 text-brand-800',
  'Pendiente de stock': 'bg-amber-100 text-amber-800',
  Despachado: 'bg-blue-100 text-blue-700',
  Cancelado: 'bg-red-100 text-red-700',
};

const CLASE_DEFAULT = 'bg-gray-100 text-gray-600';

export function claseBadgeEstado(estado: string | null | undefined): string {
  if (!estado) return CLASE_DEFAULT;
  return CLASES_POR_ESTADO[estado] ?? CLASE_DEFAULT;
}
