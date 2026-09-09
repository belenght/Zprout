// Coincide con campo.entity.ts del backend: id_campo es la PK numerica,
// nro_campo es un codigo de texto propio del campo (no el id).
export interface Campo {
  id_campo: number;
  nro_campo: string;
  ubicacion: string;
}

export type CampoPayload = Omit<Campo, 'id_campo'>;
