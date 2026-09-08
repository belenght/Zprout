export interface Proveedor {
  cuit: string;
  razon_social: string;
  contacto?: string;
}

export type ProveedorPayload = Proveedor;
