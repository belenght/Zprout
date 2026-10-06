export interface LoginRequest {
  nombre_usuario: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

// Forma del payload decodificado del JWT (ver usuario.controller.ts::login en el backend)
export interface TokenPayload {
  id_usuario: number;
  nombre_usuario: string;
  nombre: string;
  rol: string | null;
  iat: number;
  exp: number;
}

// --- Registro (GUI-02) ---
export interface RolRegistro {
  id_rol: number;
  desc_rol: string;
}

export interface RegistroRequest {
  nombre: string;
  apellido: string;
  nombre_usuario: string;
  email: string;
  password: string;
  password_repetida: string;
  id_rol_solicitado: number;
}

export type EstadoUsuario = 'pendiente' | 'activo' | 'rechazado';

// Fila de la pantalla "Solicitudes de cuenta" (admin)
export interface SolicitudUsuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  nombre_usuario: string;
  email: string;
  estado: EstadoUsuario;
  created_at: string;
  rol?: { id_rol: number; desc_rol: string } | null;
  rol_solicitado?: { id_rol: number; desc_rol: string } | null;
}