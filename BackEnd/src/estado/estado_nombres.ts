// Vocabulario oficial y cerrado de estados (ver RN - "Cuestiones Cerradas").
// No usar sinonimos ni nombres fuera de estas listas.

export const ESTADOS_LOTE = [
  'Pendiente CC',
  'En limpieza',
  'Para curar',
  'No apto',
  'Venta como grano',
  'Descarte',
] as const;

export const ESTADOS_PARTIDA = [
  'Envasado',
  'Apto para comercializacion',
  'Rechazado',
] as const;

export type EstadoLote = typeof ESTADOS_LOTE[number];
export type EstadoPartida = typeof ESTADOS_PARTIDA[number];
