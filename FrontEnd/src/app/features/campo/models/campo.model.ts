export interface Campo {
  nro_campo: number;
  nombre: string;
  ubicacion?: string;
}

export type CampoPayload = Omit<Campo, 'nro_campo'>;
