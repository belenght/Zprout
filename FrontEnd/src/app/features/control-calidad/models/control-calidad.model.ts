// Coincide con control_calidad.entity.ts del backend.
export type TipoControlCalidad = 'inicial' | 'intermedio' | 'final';
export type ResultadoControlCalidad = 'Apto' | 'No Apto';

export interface ControlCalidad {
  id_control: number;
  fecha: string;
  humedad: string;
  poder_germinativo: string;
  nivel_de_pureza: string;
  tipo_control: TipoControlCalidad;
  resultado: ResultadoControlCalidad;
  descripcion?: string | null;
}

// Body real de POST /api/controles-calidad/lote (ver control_calidad.controller.ts
// -> registrarControlCalidadLote). Este endpoint es solo para CC sobre Lote
// (inicial/intermedio); el CC final sobre Partida se maneja en el modulo de Partida (CUU06).
export interface ControlCalidadLotePayload {
  lote_id: number;
  tipo_control: 'inicial' | 'intermedio';
  humedad: number;
  poder_germinativo: number;
  nivel_de_pureza: number;
  descripcion?: string;
  // Paso 3.a.1.b de la GUI-07: si el primer intento da 409 "fuera_de_rango",
  // se vuelve a mandar el mismo payload con esto en true para forzar el alta
  // (el lote queda "No apto").
  confirmar_no_apto?: boolean;
}

// Forma del 409 que devuelve el backend cuando los valores estan fuera de
// los rangos de TipoDeSemilla y todavia no se confirmo el alta igual.
export interface RangoRespuesta {
  error: string;
  fuera_de_rango: true;
  rangos: {
    humedad: [string | null, string | null];
    poder_germinativo: [string | null, string | null];
    nivel_de_pureza: [string | null, string | null];
  };
}
