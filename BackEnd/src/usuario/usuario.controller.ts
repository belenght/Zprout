import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Usuario, type EstadoUsuario } from './usuario.entity.js';
import { Rol } from '../rol/rol.entity.js';
import { hashPassword } from '../auth/auth.service.js';
import { registrarBitacora } from '../bitacora/bitacora.helper.js';

const PASSWORD_MIN = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ESTADOS_VALIDOS = ['pendiente', 'activo', 'rechazado'] as const;

function sinPassword(usuario: Usuario) {
  const { password: _omit, foto_perfil: _foto, ...resto } = usuario as any;
  return resto;
}

export async function listarUsuarios(req: Request, res: Response) {
  const em = getEM();
  const usuarios = await em.find(Usuario, { deleted_at: null }, { populate: ['rol'] });
  res.json(usuarios.map(sinPassword));
}

export async function obtenerUsuario(req: Request, res: Response) {
  const em = getEM();
  const usuario = await em.findOne(
    Usuario,
    { id_usuario: Number(req.params.id), deleted_at: null },
    { populate: ['rol'] },
  );
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(sinPassword(usuario));
}

export async function crearUsuario(req: Request, res: Response) {
  const em = getEM();
  const { nombre, apellido, nombre_usuario, email, password, fecha_nacimiento, rol_id } = req.body;
  if (!nombre || !apellido || !nombre_usuario || !email || !password) {
    return res.status(400).json({ error: 'nombre, apellido, nombre_usuario, email y password son requeridos' });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'email invalido' });
  }
  if (String(password).length < PASSWORD_MIN) {
    return res.status(400).json({ error: `password debe tener al menos ${PASSWORD_MIN} caracteres` });
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

  res.status(201).json(sinPassword(usuario));
}

export async function actualizarUsuario(req: Request, res: Response) {
  const em = getEM();
  const usuario = await em.findOne(Usuario, { id_usuario: Number(req.params.id), deleted_at: null });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

  // Whitelist explicito en vez de em.assign(usuario, { ...req.body }).
  // OJO: "estado" y "rol_solicitado" quedan afuera a proposito: el cambio de
  // estado (aprobar/rechazar) tiene su propio endpoint (cambiarEstado) con
  // la regla de "no podes cambiar tu propio estado"; si este PUT generico
  // tambien pudiera tocar "estado", alguien podria esquivar esa regla.
  const { nombre, apellido, email, password, fecha_nacimiento, rol_id } = req.body;
  if (email !== undefined) {
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'email invalido' });
    usuario.email = email;
  }
  if (password !== undefined) {
    if (String(password).length < PASSWORD_MIN) {
      return res.status(400).json({ error: `password debe tener al menos ${PASSWORD_MIN} caracteres` });
    }
    usuario.password = await hashPassword(password);
  }
  if (nombre !== undefined) usuario.nombre = nombre;
  if (apellido !== undefined) usuario.apellido = apellido;
  if (fecha_nacimiento !== undefined) usuario.fecha_nacimiento = fecha_nacimiento;
  if (rol_id !== undefined) {
    const rol = await em.findOne(Rol, { id_rol: rol_id }) ?? undefined;
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    usuario.rol = rol;
  }

  await em.flush();
  res.json(sinPassword(usuario));
}

export async function eliminarUsuario(req: Request, res: Response) {
  const em = getEM();
  const usuario = await em.findOne(Usuario, { id_usuario: Number(req.params.id), deleted_at: null });
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (usuario.id_usuario === req.usuario?.id_usuario) {
    return res.status(400).json({ error: 'No podes eliminar tu propia cuenta' });
  }

  usuario.deleted_at = new Date();
  registrarBitacora(req, 'usuario.eliminar', `@${usuario.nombre_usuario}`);
  await em.flush();
  res.status(204).send();
}


/** Solo admin: lista usuarios por estado (default 'pendiente'). */
export async function listarSolicitudes(req: Request, res: Response) {
  const em = getEM();
  const estado = String(req.query.estado ?? 'pendiente');
  if (!ESTADOS_VALIDOS.includes(estado as EstadoUsuario)) {
    return res.status(400).json({ error: 'estado invalido' });
  }
  const usuarios = await em.find(
    Usuario,
    { estado: estado as EstadoUsuario, deleted_at: null },
    { populate: ['rol', 'rol_solicitado'], orderBy: { created_at: 'ASC' } },
  );
  res.json(usuarios.map(sinPassword));
}

/**
 * Solo admin: mueve un usuario entre pendiente / activo / rechazado.
 * Al pasar a 'activo' se asigna el rol: el de body.id_rol si viene, si no el
 * que la persona pidio al registrarse.
 */
export async function cambiarEstado(req: Request, res: Response) {
  const em = getEM();
  const { estado, id_rol } = req.body;
  if (!ESTADOS_VALIDOS.includes(estado as EstadoUsuario)) {
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
  registrarBitacora(
    req,
    estado === 'activo' ? 'solicitud.aprobar' : estado === 'rechazado' ? 'solicitud.rechazar' : 'solicitud.pendiente',
    `@${usuario.nombre_usuario}`,
    estado === 'activo' ? `Rol asignado: ${usuario.rol?.desc_rol ?? 'sin rol'}` : undefined,
  );
  await em.flush();
  // Antes devolvia res.json(usuario) directo en todos estos endpoints: el
  // hash de la contrasena quedaba expuesto igual que en actualizarUsuario.
  res.json(sinPassword(usuario));
}
