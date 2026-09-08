export interface LimpiezaClasificacion {
  id_limpieza: number;
  nro_lote: number;
  volumen_restante_tn: number;
  merma_tn: number;
  observaciones?: string | null;
  fecha: string;
}

export type LimpiezaClasificacionPayload = Omit<LimpiezaClasificacion, 'id_limpieza'>;
