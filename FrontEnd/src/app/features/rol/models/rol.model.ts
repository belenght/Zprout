export interface Rol {
  id: number;
  // TODO: completar con los campos reales de rol.entity.ts
}

export type RolPayload = Omit<Rol, 'id'>;
