import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Usuario, type EstadoUsuario } from './usuario.entity.js';
import { Rol } from '../rol/rol.entity.js';
import { hashPassword } from '../auth/auth.service.js';

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

  const passwordHasheada = await hashPassword(password);

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
    cambios.password = await hashPassword(cambios.password);
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


/** Solo admin: lista usuarios por estado (default 'pendiente'). */
export async function listarSolicitudes(req: Request, res: Response) {
  const em = getEM();
  const estado = String(req.query.estado ?? 'pendiente');
  if (!['pendiente', 'activo', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: 'estado invalido' });
  }
  const usuarios = await em.find(
    Usuario,
    { estado: estado as EstadoUsuario, deleted_at: null },
    { populate: ['rol', 'rol_solicitado'], orderBy: { created_at: 'ASC' } },
  );
  res.json(usuarios);
}

/**
 * Solo admin: mueve un usuario entre pendiente / activo / rechazado.
 * Al pasar a 'activo' se asigna el rol: el de body.id_rol si viene, si no el
 * que la persona pidio al registrarse.
 */
export async function cambiarEstado(req: Request, res: Response) {
  const em = getEM();
  const { estado, id_rol } = req.body;
  if (!['pendiente', 'activo', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: 'estado invalido' });
  }

  const usuario = await em.findOne(
    Usuario,
    { id_usuario: Number(req.params.id), deleted_at: null },
    { populate: ['rol', 'rol_solicitado'] },
  );
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (usuario.id_usuario === req.usuario?.id_usuario) {
    return res.status(400).json({ error: 'No podes cambiar tu propio estado' });
  }

  if (estado === 'activo') {
    const rol = id_rol
      ? await em.findOne(Rol, { id_rol: Number(id_rol), deleted_at: null })
      : (usuario.rol_solicitado ?? usuario.rol);
    if (!rol) return res.status(400).json({ error: 'Hay que asignar un rol para aprobar' });
    usuario.rol = rol;
  }

  usuario.estado = estado as EstadoUsuario;
  await em.flush();
  res.json(usuario);
}