import { EstadoUsuario } from './login';

// Espejo de BackEnd/src/usuario/gestion.controller.ts (filaDe / detalle)
export interface UsuarioAdmin {
  id_usuario: number;
  nombre: string;
  apellido: string;
  nombre_usuario: string;
  email: string;
  fecha_nacimiento: string | null; // YYYY-MM-DD
  estado: EstadoUsuario;
  activo: boolean;
  rol: { id_rol: number; desc_rol: string } | null;
  rol_solicitado: { id_rol: number; desc_rol: string } | null;
  created_at: string;
  updated_at: string;
  foto?: string | null; // solo en el detalle (data URL JPEG)
}

export interface ActualizarUsuarioAdminPayload {
  nombre?: string;
  apellido?: string;
  email?: string;
  fecha_nacimiento?: string | null;
  nombre_usuario?: string;
  id_rol?: number;
  activo?: boolean;
}
