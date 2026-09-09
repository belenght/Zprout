// Coincide con proveedor.entity.ts del backend: id_proveedor es la PK.
export interface Proveedor {
  id_proveedor: number;
  razon_social: string;
  cuit?: string;
  contacto?: string;
}

export type ProveedorPayload = Omit<Proveedor, 'id_proveedor'>;
