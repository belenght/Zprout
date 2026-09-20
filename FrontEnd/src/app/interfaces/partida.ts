import { Lote } from './lote';

// DTO que llega del backend (partida.controller.ts::conEstadoActual): trae
// el Lote de origen populado y el estado_actual calculado, igual que Lote.
export interface Partida {
  id_partida: number;
  nro_partida: string;
  volumen_en_tn: string;
  tipo_curado: 'fungicida' | 'insecticida' | 'mixto';
  cantidad_bolsas_20kg?: number;
  fecha_curado?: string;
  fecha_envasado?: string;
  lote: Lote | number;
  estado_actual?: string | null;
}

// Body que espera POST /api/partidas/curado (CUU05)
export interface RegistrarCuradoPayload {
  lote_id: number;
  volumen_a_curar_tn: number;
  tipo_curado: 'fungicida' | 'insecticida' | 'mixto';
  insumos?: { insumo_id: number; cantidad: number }[];
}

// Body que espera POST /api/partidas/control-final (CUU06)
export interface RegistrarControlFinalPayload {
  partida_id: number;
  humedad: number;
  poder_germinativo: number;
  nivel_de_pureza: number;
  cantidad_bolsas_20kg?: number;
  fecha_envasado?: string;
  // true cuando el usuario ya confirmo el rechazo pese al valor fuera de
  // rango (CUU06, alternativo 3.b)
  confirmar_no_apto?: boolean;
}

export interface InformeDePartida {
  nro_partida: string;
  nro_lote_origen: string;
  fecha_envasado: string;
  cantidad_bolsas_20kg?: number;
  resultados_calidad: { humedad: number; poder_germinativo: number; nivel_de_pureza: number };
  estado: string;
}

// Respuesta de POST /api/partidas/control-final
export interface ResultadoControlFinal {
  partida: Partida;
  control: { resultado: 'Apto' | 'No Apto' };
  informe_generado: boolean;
  informe_de_partida?: InformeDePartida;
}

