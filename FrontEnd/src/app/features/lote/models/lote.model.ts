import { TipoSemilla } from '../../tipo-semilla/models/tipo-semilla.model';
import { Campo } from '../../campo/models/campo.model';
import { Proveedor } from '../../proveedor/models/proveedor.model';
import { Almacen } from '../../almacen/models/almacen.model';
import { NombreEstadoLote } from '../../estado/models/estado.model';

// Coincide con lote.entity.ts del backend. origen_semilla va en minuscula
// (enum OrigenSemilla del backend: 'propio' | 'externo'), no 'Propio'/'Externo'.
export type OrigenSemilla = 'propio' | 'externo';

export interface Lote {
  id_lote: number;
  nro_lote: string; // codigo generado por el backend (campo/proveedor + fecha), no es el id
  origen_semilla: OrigenSemilla;
  descripcion_origen?: string;
  cantidad_semillas_en_tn: string; // decimal, el backend lo serializa como string
  fecha_ingreso: string; // ISO date
  observaciones?: string;
  informe_calidad_externo?: string;

  // Populados por el backend en listarLotes/obtenerLote (ver lote.controller.ts)
  tipo_semilla: TipoSemilla;
  campo?: Campo;
  proveedor?: Proveedor;
  almacen?: Almacen; // silo o galpon donde esta guardado hoy (ver modulo Almacen, GUI-15)

  // Agregado a mano por el backend (no es una columna de Lote): ultimo Estado
  // abierto (fecha_hasta null) para este lote. Null si todavia no tiene ninguno.
  estado_actual?: NombreEstadoLote | null;
}

// Body real que espera POST /api/lotes (ver lote.controller.ts -> registrarIngresoLote).
export interface LotePayload {
  tipo_semilla_id: number;
  cantidad_semillas_en_tn: number;
  origen_semilla: OrigenSemilla;
  campo_id?: number;       // requerido si origen_semilla === 'propio'
  proveedor_id?: number;   // requerido si origen_semilla === 'externo'
  informe_calidad_externo?: string; // referencia de texto (URL/nombre); el backend no recibe archivos
  observaciones?: string;
}
