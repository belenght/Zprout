import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

/**
 * Payload que viaja dentro del JWT. El rol va como el desc_rol textual
 * (ej. "administrador"), no el id, porque es lo que el RoleGuard del front
 * compara contra route.data['roles'].
 */
export interface JwtPayload {
  id_usuario: number;
  nombre_usuario: string;
  nombre: string;
  rol: string | null;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no esta configurado en las variables de entorno');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
}
