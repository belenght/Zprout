import type { NextFunction, Request, Response } from 'express';

/**
 * Permisos de ESCRITURA por rol (alta/modificacion/baja), segun los perfiles
 * de la Vision y la Matriz CRUD:
 *   - Encargado de Acopio: ingresos de lote y almacen.
 *   - Responsable de Calidad: controles de calidad (inicial, intermedio, final).
 *   - Operario de Planta: limpieza y curado/envasado.
 *   - Encargado Comercial: pedidos y estimaciones de venta.
 *   - Director: solo lectura.
 *   - Administrador: todo.
 * La LECTURA (GET) queda abierta a cualquier usuario autenticado: los
 * formularios y el dashboard necesitan consultar catalogos y estados.
 *
 * Importante: si se cambia algo aca, tambien hay que cambiarlo en
 * FrontEnd/src/app/shared/permisos.ts (menu y botones).
 */
export const ROL_ADMIN = 'administrador';
export const ROL_ACOPIO = 'encargado_acopio';
export const ROL_CALIDAD = 'responsable_calidad';
export const ROL_OPERARIO = 'operario_planta';
export const ROL_COMERCIAL = 'encargado_comercial';
export const ROL_DIRECTOR = 'director';

interface Regla {
  /** Prefijo de la ruta (sin /api). */
  prefijo: string;
  /** Si se indica, la regla solo aplica a rutas cuyo resto matchea. */
  resto?: RegExp;
  /** Roles que pueden escribir (el administrador siempre puede). */
  roles: string[];
}

// El orden importa: gana la primera regla que coincide.
const REGLAS: Regla[] = [
  // Cada persona gestiona su propia cuenta (la propia ruta valida el resto).
  { prefijo: '/usuarios/me', roles: ['*'] },
  { prefijo: '/usuarios', roles: [] }, // gestion, solicitudes, etc.: solo admin
  { prefijo: '/bitacora', roles: [] },

  // RN 14: el destino fisico lo resuelve el Operario de Planta; CUU03 5.a.3: lo registra el Responsable de Calidad
  { prefijo: '/lotes', resto: /^\/\d+\/destino/, roles: [ROL_OPERARIO, ROL_CALIDAD] },
  { prefijo: '/lotes', resto: /^\/\d+\/almacen/, roles: [ROL_ACOPIO] },
  { prefijo: '/lotes', resto: /^\/\d+\/controles-calidad/, roles: [ROL_CALIDAD] },
  { prefijo: '/lotes', resto: /^\/\d+\/limpiezas/, roles: [ROL_OPERARIO] },
  { prefijo: '/lotes', roles: [ROL_ACOPIO] }, // CUU01: registrar ingreso

  { prefijo: '/controles-calidad', roles: [ROL_CALIDAD] }, // CUU02
  { prefijo: '/limpiezas', roles: [ROL_OPERARIO] }, // CUU03
  { prefijo: '/partidas/curado', roles: [ROL_OPERARIO] }, // CUU05
  { prefijo: '/partidas/control-final', roles: [ROL_CALIDAD] }, // CUU06
  { prefijo: '/partidas', roles: [] },

  { prefijo: '/pedidos', roles: [ROL_COMERCIAL] }, // CUU07
  { prefijo: '/estimaciones-venta', roles: [ROL_COMERCIAL, ROL_ACOPIO] },
  { prefijo: '/almacenes', roles: [ROL_ACOPIO] },
  // El operario crea insumos "al vuelo" al registrar un curado.
  { prefijo: '/insumos', roles: [ROL_OPERARIO, ROL_ACOPIO] },
  { prefijo: '/campos', roles: [ROL_ACOPIO] },
  { prefijo: '/proveedores', roles: [ROL_ACOPIO] },
  { prefijo: '/tipos-semilla', roles: [ROL_ACOPIO] },
  { prefijo: '/campanas', roles: [] },
  { prefijo: '/roles', roles: [] },
  { prefijo: '/estados', roles: [] },
];

const METODOS_DE_LECTURA = new Set(['GET', 'HEAD', 'OPTIONS']);

export function rolesConPermisoDeEscritura(ruta: string): string[] | null {
  for (const regla of REGLAS) {
    if (ruta !== regla.prefijo && !ruta.startsWith(regla.prefijo + '/')) continue;
    if (regla.resto && !regla.resto.test(ruta.slice(regla.prefijo.length))) continue;
    return regla.roles;
  }
  return null;
}

/** Usar DESPUES de verificarToken. */
export function controlarAcceso(req: Request, res: Response, next: NextFunction) {
  if (METODOS_DE_LECTURA.has(req.method)) {
    // Estas rutas de lectura son solo para administradores.
    const ruta = req.path;
    const soloAdmin = ['/usuarios/gestion', '/usuarios/solicitudes', '/bitacora'];
    if (soloAdmin.some((p) => ruta === p || ruta.startsWith(p + '/')) && req.usuario?.rol !== ROL_ADMIN) {
      return res.status(403).json({ error: 'No tenes permisos para realizar esta accion' });
    }
    return next();
  }

  const rol = req.usuario?.rol;
  if (rol === ROL_ADMIN) return next();

  const permitidos = rolesConPermisoDeEscritura(req.path);
  if (permitidos === null) return next(); // ruta fuera del mapa (p. ej. /health)
  if (permitidos.includes('*') || (rol && permitidos.includes(rol))) return next();

  return res.status(403).json({ error: 'Tu rol no tiene permiso para realizar esta accion' });
}
