// La tabla "estado" del backend es generica: guarda el historial de estados
// tanto de un Lote como de una Partida. Se distinguen las dos formas de uso
// con los siguientes tipos, para que cada feature consuma el que le corresponde.
//
// Vocabulario cerrado (ver estado_nombres.ts del backend) — no inventar otros
// valores, el backend los rechaza fuera de esta lista igual.

export type NombreEstadoLote =
  | 'Pendiente CC'
  | 'En limpieza'
  | 'Para curar'
  | 'No apto'
  | 'Venta como grano'
  | 'Descarte';

export type NombreEstadoPartida =
  | 'Envasado'
  | 'Apto para comercializacion'
  | 'Rechazado';

// Forma real de una fila devuelta por GET /api/estados/... (ver estado.controller.ts).
// Estado no tiene endpoints de escritura: se genera solo, como efecto de las
// acciones de negocio (CUU01/02/03/05/06), nunca por alta manual desde el front.
export interface EstadoLote {
  id_estado: number;
  nombre: NombreEstadoLote;
  fecha_desde: string;
  fecha_hasta?: string | null;
}

export interface EstadoPartida {
  id_estado: number;
  nombre: NombreEstadoPartida;
  fecha_desde: string;
  fecha_hasta?: string | null;
}
