// desc_rol (el texto que viaja en el JWT y que compara el RoleGuard) -> etiqueta
// para mostrar. Tienen que coincidir con los desc_rol que carga seed-roles.ts.
export const ROL_ADMIN = 'administrador';

const ETIQUETAS_ROL: Record<string, string> = {
  administrador: 'Administrador',
  encargado_acopio: 'Encargado de Acopio',
  responsable_calidad: 'Responsable de Calidad',
  operario_planta: 'Operario de Planta',
  encargado_comercial: 'Encargado del Área Comercial',
};

export function etiquetaRol(desc_rol?: string | null): string {
  if (!desc_rol) return '—';
  return ETIQUETAS_ROL[desc_rol] ?? desc_rol;
}