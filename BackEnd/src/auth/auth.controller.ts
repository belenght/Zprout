import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { comparePassword, generateToken } from './auth.service.js';

/**
 * Login (GUI-01). Verifica password con bcrypt y devuelve un JWT firmado con
 * { id_usuario, nombre_usuario, rol } en el payload (ver auth.service.ts).
 */
export async function login(req: Request, res: Response) {
  const em = getEM();
  const { nombre_usuario, password } = req.body;
  if (!nombre_usuario || !password) {
    return res.status(400).json({ error: 'nombre_usuario y password son requeridos' });
  }

  const usuario = await em.findOne(
    Usuario,
    { nombre_usuario, activo: true, deleted_at: null },
    { populate: ['rol'] },
  );
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const passwordValida = await comparePassword(password, usuario.password);
  if (!passwordValida) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const token = generateToken({
    id_usuario: usuario.id_usuario,
    nombre_usuario: usuario.nombre_usuario,
    nombre: usuario.nombre,
    rol: usuario.rol?.desc_rol ?? null,
  });

  res.json({ token });
}
