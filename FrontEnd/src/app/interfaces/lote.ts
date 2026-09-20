import { Campo, Proveedor, TipoDeSemilla } from './catalogos';
import { Almacen } from './almacen';

export type OrigenSemilla = 'propio' | 'externo';

// DTO que llega del backend (lote.controller.ts::conEstadoActual): trae las
// relaciones populadas y el estado_actual calculado, no solo los ids crudos.
export interface Lote {
  id_lote?: number;
  nro_lote?: string; // lo genera el backend, no se manda al crear
  origen_semilla: OrigenSemilla;
  descripcion_origen?: string;
  cantidad_semillas_en_tn: string;
  fecha_ingreso?: string;
  observaciones?: string;
  informe_calidad_externo?: string;
  tipo_semilla: TipoDeSemilla | number;
  campo?: Campo | number;
  proveedor?: Proveedor | number;
  almacen?: Almacen | number | null;
  estado_actual?: string | null;
}

// Body que espera POST /api/lotes (CUU01) - distinto al DTO de lectura,
// porque acá las relaciones van como *_id sueltos.
export interface NuevoLotePayload {
  tipo_semilla_id: number;
  cantidad_semillas_en_tn: number;
  origen_semilla: OrigenSemilla;
  campo_id?: number;
  proveedor_id?: number;
  informe_calidad_externo?: string;
  observaciones?: string;
}
