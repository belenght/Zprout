export interface Usuario {
  id: number;
  // TODO: completar con los campos reales de usuario.entity.ts
}

export type UsuarioPayload = Omit<Usuario, 'id'>;
