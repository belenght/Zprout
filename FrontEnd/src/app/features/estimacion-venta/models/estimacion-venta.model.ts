export interface EstimacionVenta {
  id: number;
  // TODO: completar con los campos reales de estimacion_venta.entity.ts
}

export type EstimacionVentaPayload = Omit<EstimacionVenta, 'id'>;
