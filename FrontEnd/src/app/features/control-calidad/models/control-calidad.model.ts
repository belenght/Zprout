export type TipoControlCalidad = 'Inicial' | 'Final';

export interface ControlCalidad {
  id_control: number;
  nro_partida?: number | null;
  nro_lote?: number | null;
  fecha: string;
  humedad: number;
  poder_germinativo: number;
  nivel_de_pureza: number;
  tipo_control: TipoControlCalidad;
  descripcion?: string | null;
}

export type ControlCalidadPayload = Omit<ControlCalidad, 'id_control'>;
