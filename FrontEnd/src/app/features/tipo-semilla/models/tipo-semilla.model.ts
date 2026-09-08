export interface TipoSemilla {
  id_semilla: number;
  nombre_semilla: string;
  variante_semilla: string;
  humedad_min: number;
  humedad_max: number;
  poder_germinativo_min: number;
  poder_germinativo_max: number;
  nivel_pureza_min: number;
  nivel_pureza_max: number;
  duracion: number;
}

export type TipoSemillaPayload = Omit<TipoSemilla, 'id_semilla'>;
