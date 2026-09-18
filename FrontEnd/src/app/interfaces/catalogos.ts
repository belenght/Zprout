export interface Campo {
  id_campo?: number;
  nro_campo: string;
  ubicacion: string;
}

export interface Proveedor {
  id_proveedor?: number;
  razon_social: string;
  cuit?: string;
  contacto?: string;
}

export interface TipoDeSemilla {
  id_semilla?: number;
  nombre_semilla: string;
  variante_semilla: string;
  humedad_min?: string;
  humedad_max?: string;
  poder_germinativo_min?: string;
  poder_germinativo_max?: string;
  nivel_pureza_min?: string;
  nivel_pureza_max?: string;
  duracion?: string;
}
