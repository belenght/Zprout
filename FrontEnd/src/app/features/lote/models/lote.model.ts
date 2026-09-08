export type OrigenSemilla = 'Propio' | 'Externo';

export interface Lote {
  nro_lote: number;
  nro_campo?: number | null;      // requerido si origen_semilla = 'Propio'
  id_almacen: number;
  id_semilla: number;
  cuit?: string | null;           // requerido si origen_semilla = 'Externo' (proveedor)
  origen_semilla: OrigenSemilla;
  cantidad_semillas_en_tn: number;
  descripcion_origen: string;
  fecha_creacion: string;         // ISO date

  // Campo de conveniencia para el listado: el estado vigente del lote es en
  // realidad la ultima fila de EstadoLote (fecha_hasta null). Se asume que el
  // backend lo devuelve ya resuelto en el GET /lote; si no, hay que pedirlo
  // aparte via estado.service y cruzarlo por nro_lote.
  estado_actual?: import('../../estado/models/estado.model').NombreEstadoLote;
}

export type LotePayload = Omit<Lote, 'nro_lote' | 'fecha_creacion'>;
