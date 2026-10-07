export interface EstadoHistorial {
  id_estado: number;
  nombre: string;
  fecha_desde: string;
  fecha_hasta?: string | null;
  usuario: {
    id_usuario: number;
    nombre: string;
    apellido: string;
  } | null;
}
