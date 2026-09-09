// El backend no devuelve "perfil" como enum cerrado, sino Rol.desc_rol
// (texto libre definido en la tabla rol: 'administrador', 'operario', etc).
// Se deja como string hasta que se acuerde un listado fijo de roles con el backend.
export type PerfilUsuario = string;

export interface RolUsuario {
  id_rol: number;
  desc_rol: PerfilUsuario;
}

// Forma real de la respuesta de POST /api/auth/login (ver usuario.controller.ts -> login).
// No incluye token: el backend todavia no firma JWT, solo valida usuario/password.
export interface LoginResponse {
  id_usuario: number;
  nombre: string;
  rol?: RolUsuario;
}

// Sesion que se guarda en localStorage y consume el resto del front (main-layout, guard).
export interface UsuarioAutenticado {
  id_usuario: number;
  nombre: string;
  perfil: PerfilUsuario;
}

// Body real que espera el backend (nombre_usuario / password), NO usuario/contrasena.
// El formulario de login.ts sigue usando esos nombres para los controles (coincide con
// el copy de la GUI-01), y traduce al armar el payload.
export interface LoginPayload {
  nombre_usuario: string;
  password: string;
}
