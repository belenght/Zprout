export interface Campana {
  id: number;
  // TODO: completar con los campos reales de campana.entity.ts
}

export type CampanaPayload = Omit<Campana, 'id'>;
