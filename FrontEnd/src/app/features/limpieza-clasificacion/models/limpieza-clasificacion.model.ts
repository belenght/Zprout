// Coincide con limpieza_clasificacion.entity.ts del backend.
export interface LimpiezaClasificacion {
  id_limpieza: number;
  volumen_restante_tn: string;
  merma_tn: string;
  observaciones?: string | null;
  fecha: string;
}

// Body real de POST /api/limpiezas (ver limpieza_clasificacion.controller.ts
// -> registrarLimpieza). Precondicion del backend: el lote tiene que estar
// en estado 'En limpieza'; si no, responde 409.
export interface LimpiezaPayload {
  lote_id: number;
  volumen_restante_tn: number;
  merma_tn: number;
  observaciones?: string;
  operario_id?: number;
}
