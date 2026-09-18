import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getEM } from '../shared/db/orm.js';
import { Usuario } from './usuario.entity.js';
import { Rol } from '../rol/rol.entity.js';

const SALT_ROUNDS = 10;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no esta configurado en las variables de entorno');
  }
  return secret;
}

export async function listarUsuarios(req: Request, res: Response) {
  const em = getEM();
  const usuarios = await em.find(Usuario, { deleted_at: null }, { populate: ['rol'] });
  res.json(usuarios);
}

export async function obtenerUsuario(req: Request, res: Response) {
  const em = getEM();
  const usuario = await em.findOne(
    Usuario,
    { id_usuario: Number(req.params.id), deleted_at: null },
    { populate: ['rol'] },
  );
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(usuario);
}

export async function crearUsuario(req: Request, res: Response) {
  const em = getEM();
  const { nombre, apellido, nombre_usuario, email, password, fecha_nacimiento, rol_id } = req.body;
  if (!nombre || !apellido || !nombre_usuario || !email || !password) {
    return res.status(400).json({ error: 'nombre, apellido, nombre_usuario, email y password son requeridos' });
  }

  const existente = await em.findOne(Usuario, { nombre_usuario, deleted_at: null });
  if (existente) return res.status(409).json({ error: 'nombre_usuario ya esta en uso' });

  let rol: Rol | undefined;
  if (rol_id) {
    rol = await em.findOne(Rol, { id_rol: rol_id }) ?? undefined;
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
  }

  const passwordHasheada = await bcrypt.hash(password, SALT_ROUNDS);

  const usuario = em.create(Usuario, {
    nombre, apellido, nombre_usuario, email, password: passwordHasheada, fecha_nacimiento, rol,
  });
  em.persist(usuario);
  await em.flush();

  const { password: _omit, ...usuarioSinPassword } = usuario;
  res.status(201).json(usuarioSinPassword);
}

export async function actualizarUsuario(req: Request, res: Response) {
  const em = getEM();
  const usuario = await em.findOne(Usuario, { id_usuario: Number(req.params.id), deleted_at: null });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  const cambios = { ...req.body };
  if (cambios.password) {
    cambios.password = await bcrypt.hash(cambios.password, SALT_ROUNDS);
  }

  em.assign(usuario, cambios);
  await em.flush();
  res.json(usuario);
}

export async function eliminarUsuario(req: Request, res: Response) {
  const em = getEM();
  const usuario = await em.findOne(Usuario, { id_usuario: Number(req.params.id), deleted_at: null });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  usuario.deleted_at = new Date();
  await em.flush();
  res.status(204).send();
}

/**
 * Login (GUI-01). Verifica password con bcrypt y devuelve un JWT firmado con
 * { id_usuario, nombre_usuario, rol } en el payload. El rol viaja como el
 * desc_rol textual (ej. "administrador"), no el id, porque es lo que el
 * RoleGuard del front compara contra route.data['roles'].
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

  const passwordValida = await bcrypt.compare(password, usuario.password);
  if (!passwordValida) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const token = jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      nombre_usuario: usuario.nombre_usuario,
      nombre: usuario.nombre,
      rol: usuario.rol?.desc_rol ?? null,
    },
    getJwtSecret(),
    { expiresIn: '8h' },
  );

  res.json({ token });
}
