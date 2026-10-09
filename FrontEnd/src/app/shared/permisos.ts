import { ROL_ADMIN } from './roles';

// Espejo en el front de BackEnd/src/auth/permisos.ts. Es solo para ocultar
// botones y items de menu; la validacion real la hace el backend (403).
// El administrador puede todo y el director es de solo lectura.
export const ROL_ACOPIO = 'encargado_acopio';
export const ROL_CALIDAD = 'responsable_calidad';
export const ROL_OPERARIO = 'operario_planta';
export const ROL_COMERCIAL = 'encargado_comercial';
export const ROL_DIRECTOR = 'director';

export type Capacidad =
  | 'lotes.ingresar'
  | 'lotes.destino'
  | 'lotes.almacen'
  | 'calidad.registrar'
  | 'limpieza.registrar'
  | 'curado.registrar'
  | 'curado.controlFinal'
  | 'pedidos.gestionar'
  | 'estimaciones.gestionar'
  | 'almacenes.gestionar'
  | 'insumos.gestionar'
  | 'catalogos.gestionar';

const PERMISOS: Record<Capacidad, string[]> = {
  'lotes.ingresar': [ROL_ACOPIO],
  'lotes.destino': [ROL_OPERARIO, ROL_CALIDAD],
  'lotes.almacen': [ROL_ACOPIO],
  'calidad.registrar': [ROL_CALIDAD],
  'limpieza.registrar': [ROL_OPERARIO],
  'curado.registrar': [ROL_OPERARIO],
  'curado.controlFinal': [ROL_CALIDAD],
  'pedidos.gestionar': [ROL_COMERCIAL],
  'estimaciones.gestionar': [ROL_COMERCIAL, ROL_ACOPIO],
  'almacenes.gestionar': [ROL_ACOPIO],
  'insumos.gestionar': [ROL_OPERARIO, ROL_ACOPIO],
  'catalogos.gestionar': [ROL_ACOPIO],
};

export function rolPuede(rol: string | null, capacidad: Capacidad): boolean {
  if (!rol) return false;
  return rol === ROL_ADMIN || PERMISOS[capacidad].includes(rol);
}
