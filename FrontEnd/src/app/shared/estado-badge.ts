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

// Variante "pastel" (fondo suave + texto oscuro del mismo tono) que usan las
// tablas del boceto (Dashboard, Listado de lotes...). Los hex entre corchetes
// son los pasteles del boceto. Se mantiene el nombre claseBadgeEstadoSolido
// para no tocar los componentes que ya lo usan.
const VERDE = 'bg-[#dff3e4] text-[#1b7a43]';
const AMBAR = 'bg-[#fbeacb] text-[#8a5a0b]';
const AZUL = 'bg-[#dceafb] text-[#1d4e89]';
const GRIS = 'bg-[#ecece8] text-[#555550]';
const ROJO = 'bg-[#fbe1e1] text-[#9b2c2c]';
const DORADO = 'bg-[#f6f0c4] text-[#6f5b00]';

const CLASES_SOLIDAS_POR_ESTADO: Record<string, string> = {
  // Estados de Lote
  'Pendiente CC': AMBAR,
  'En limpieza': AZUL,
  'Para curar': DORADO,
  'No apto': ROJO,
  'Venta como grano': GRIS,
  Descarte: ROJO,
  // Estados de Partida
  Envasado: AZUL,
  'Apto para comercializacion': VERDE,
  Rechazado: ROJO,
  // Estados de Pedido
  'Aprobado para despacho': VERDE,
  'Pendiente de stock': AMBAR,
  Despachado: AZUL,
  Cancelado: ROJO,
};

const CLASE_SOLIDA_DEFAULT = GRIS;

export function claseBadgeEstadoSolido(estado: string | null | undefined): string {
  if (!estado) return CLASE_SOLIDA_DEFAULT;
  return CLASES_SOLIDAS_POR_ESTADO[estado] ?? CLASE_SOLIDA_DEFAULT;
}
