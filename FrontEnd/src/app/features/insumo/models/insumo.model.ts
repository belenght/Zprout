export interface Insumo {
  id: number;
  // TODO: completar con los campos reales de insumo.entity.ts
}

export type InsumoPayload = Omit<Insumo, 'id'>;
