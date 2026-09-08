export interface Almacen {
  id_almacen: number;
  nombre: string;
  ubicacion?: string;
}

export type AlmacenPayload = Omit<Almacen, 'id_almacen'>;
