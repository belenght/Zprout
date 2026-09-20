export type TipoControl = 'inicial' | 'intermedio' | 'final';
export type ResultadoControl = 'Apto' | 'No Apto';

// DTO que llega del backend (control_calidad.controller.ts)
export interface ControlDeCalidad {
  id_control?: number;
  fecha?: string;
  humedad: string;
  poder_germinativo: string;
  nivel_de_pureza: string;
  tipo_control: TipoControl;
  resultado?: ResultadoControl;
  descripcion?: string;
}

// Body que espera POST /api/controles-calidad/lote (CUU02, sobre Lote:
// inicial o intermedio). El control final sobre Partida se maneja en
// partida.service.ts (CUU06), porque ahi tambien se genera el Informe.
export interface RegistrarControlLotePayload {
  lote_id: number;
  tipo_control: 'inicial' | 'intermedio';
  humedad: number;
  poder_germinativo: number;
  nivel_de_pureza: number;
  descripcion?: string;
  // true cuando el usuario ya confirmo que el valor fuera de rango es
  // correcto (CUU02, alternativo 3.a.1.b)
  confirmar_no_apto?: boolean;
}

// Forma exacta del body que devuelve el backend con status 409 cuando los
// parametros estan fuera de rango y todavia no se confirmo (ver
// control_calidad.controller.ts::registrarControlCalidadLote)
export interface RangosFueraDeRango {
  humedad: [string | null | undefined, string | null | undefined];
  poder_germinativo: [string | null | undefined, string | null | undefined];
  nivel_de_pureza: [string | null | undefined, string | null | undefined];
}
