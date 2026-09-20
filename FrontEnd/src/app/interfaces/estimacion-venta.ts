import { Lote } from './lote';

// DTO que llega del backend (estimacion_venta.controller.ts)
export interface EstimacionVenta {
  id_estimacion?: number;
  lote: Lote | number;
  campana: any;
  volumen_estimado_tn: string;
  fecha_carga?: string;
}
