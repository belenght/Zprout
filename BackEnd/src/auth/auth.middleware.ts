import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret, JwtPayload } from './auth.service.js';

// Permite colgar el usuario autenticado en req.usuario sin castear en cada handler.
declare module 'express-serve-static-core' {
  interface Request {
    usuario?: JwtPayload;
  }
}

/**
 * Verifica el JWT recibido en el header Authorization: Bearer <token>.
 * Si es valido, cuelga el payload decodificado en req.usuario y sigue.
 * El interceptor del front (auth.interceptor.ts) es el que agrega este header
 * a cada request saliente cuando hay sesion.
 */
export function verificarToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no provisto' });
  }

  const token = header.slice('Bearer '.length);
  try {
    req.usuario = jwt.verify(token, getJwtSecret()) as JwtPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

/**
 * Restringe el acceso a los roles indicados (desc_rol textual, ej: 'administrador').
 * Usar siempre DESPUES de verificarToken en la cadena de middlewares:
 *   router.delete('/:id', verificarToken, verificarRol('administrador'), ctrl.eliminar);
 */
export function verificarRol(...rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rol = req.usuario?.rol;
    if (!rol || !rolesPermitidos.includes(rol)) {
      return res.status(403).json({ error: 'No tenes permisos para realizar esta accion' });
    }
    next();
  };
}