// La tabla "estado" del backend es generica: guarda el historial de estados
// tanto de un Lote como de una Partida. Se distinguen las dos formas de uso
// con los siguientes tipos, para que cada feature consuma el que le corresponde.

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

export interface EstadoLote {
  id_estado: number;
  nro_lote: number;
  nombre: NombreEstadoLote;
  fecha_desde: string;
  fecha_hasta?: string | null;
}

export interface EstadoPartida {
  id_estado: number;
  nro_partida: number;
  nombre: NombreEstadoPartida;
  fecha_desde: string;
  fecha_hasta?: string | null;
}

export type EstadoLotePayload = Omit<EstadoLote, 'id_estado'>;
export type EstadoPartidaPayload = Omit<EstadoPartida, 'id_estado'>;
