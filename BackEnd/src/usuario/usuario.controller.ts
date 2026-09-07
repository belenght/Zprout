import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Usuario } from './usuario.entity.js';
import { Rol } from '../rol/rol.entity.js';
// NOTA: falta agregar hashing real de password (ej. bcrypt) antes de produccion.
// Se deja "password" en texto plano aca solo a nivel de estructura del controller.

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

  const usuario = em.create(Usuario, {
    nombre, apellido, nombre_usuario, email, password, fecha_nacimiento, rol,
  });
  em.persist(usuario);
  await em.flush();
  res.status(201).json(usuario);
}

export async function actualizarUsuario(req: Request, res: Response) {
  const em = getEM();
  const usuario = await em.findOne(Usuario, { id_usuario: Number(req.params.id), deleted_at: null });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  em.assign(usuario, req.body);
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

// Login basico (GUI-01). Reemplazar comparacion de password por bcrypt.compare en produccion.
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
  if (!usuario || usuario.password !== password) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  res.json({ id_usuario: usuario.id_usuario, nombre: usuario.nombre, rol: usuario.rol });
}
