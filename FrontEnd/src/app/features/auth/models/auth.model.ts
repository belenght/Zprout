export type PerfilUsuario =
  | 'Encargado de Acopio'
  | 'Operario de Planta'
  | 'Responsable de Calidad'
  | 'Comercial';

export interface UsuarioAutenticado {
  usuario: string;
  nombre: string;
  perfil: PerfilUsuario;
  token: string;
}

export interface LoginPayload {
  usuario: string;
  contrasena: string;
}
