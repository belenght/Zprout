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
