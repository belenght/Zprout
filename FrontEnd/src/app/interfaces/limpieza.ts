// DTO que llega del backend (limpieza_clasificacion.controller.ts)
export interface LimpiezaClasificacion {
  id_limpieza?: number;
  volumen_restante_tn: string;
  merma_tn: string;
  observaciones?: string;
  fecha?: string;
}

// Body que espera POST /api/limpiezas (CUU03)
export interface RegistrarLimpiezaPayload {
  lote_id: number;
  volumen_restante_tn: number;
  merma_tn: number;
  observaciones?: string;
  operario_id?: number;
}
