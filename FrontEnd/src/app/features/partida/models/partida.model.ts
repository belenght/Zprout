export type TipoCurado = 'Fungicida' | 'Insecticida' | 'Mixto';

export interface Partida {
  nro_partida: number;
  nro_lote: number;
  volumen_en_tn: number;
  tipo_curado: TipoCurado;
  fecha_curado: string;
  fecha_envasado?: string | null;
}

export type PartidaPayload = Omit<Partida, 'nro_partida'>;
