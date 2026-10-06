import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Rol } from '../rol/rol.entity.js';
import { comparePassword, generateToken, hashPassword } from './auth.service.js';

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

  // Recien despues de validar la clave: asi no se filtra el estado de una
  // cuenta a quien no tiene la contraseña.
  if (usuario.estado === 'pendiente') {
    return res.status(403).json({ error: 'Tu cuenta esta pendiente de aprobacion por un administrador' });
  }
  if (usuario.estado === 'rechazado') {
    return res.status(403).json({ error: 'Tu solicitud fue rechazada. Contacta al administrador' });
  }

  const token = generateToken({
    id_usuario: usuario.id_usuario,
    nombre_usuario: usuario.nombre_usuario,
    nombre: usuario.nombre,
    rol: usuario.rol?.desc_rol ?? null,
  });

  res.json({ token });
}

/** Publico: roles que se pueden pedir al registrarse (nunca el administrador). */
export async function rolesParaRegistro(req: Request, res: Response) {
  const em = getEM();
  const roles = await em.find(
    Rol,
    { deleted_at: null, desc_rol: { $ne: 'administrador' } },
    { orderBy: { id_rol: 'ASC' } },
  );
  res.json(roles.map((r) => ({ id_rol: r.id_rol, desc_rol: r.desc_rol })));
}

/** Publico: crea la cuenta en estado 'pendiente'. No devuelve token. */
export async function registro(req: Request, res: Response) {
  const em = getEM();
  const { nombre, apellido, nombre_usuario, email, password, password_repetida, id_rol_solicitado } = req.body;

  if (!nombre || !apellido || !nombre_usuario || !email || !password || !id_rol_solicitado) {
    return res.status(400).json({ error: 'Completa todos los campos' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  if (password !== password_repetida) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalido' });
  }

  // Esta validacion es la que importa: ocultar 'administrador' en el front no
  // alcanza, cualquiera puede mandar el request a mano.
  const rolSolicitado = await em.findOne(Rol, { id_rol: Number(id_rol_solicitado), deleted_at: null });
  if (!rolSolicitado || rolSolicitado.desc_rol === 'administrador') {
    return res.status(400).json({ error: 'Rol solicitado invalido' });
  }

  // Sin filtrar deleted_at: los unique de la tabla tambien incluyen filas dadas de baja.
  const existente = await em.findOne(Usuario, { $or: [{ nombre_usuario }, { email }] });
  if (existente) {
    return res.status(409).json({ error: 'El nombre de usuario o el email ya estan en uso' });
  }

  const usuario = em.create(Usuario, {
    nombre,
    apellido,
    nombre_usuario,
    email,
    password: await hashPassword(password),
    estado: 'pendiente',
    rol_solicitado: rolSolicitado,
  });
  em.persist(usuario);
  await em.flush();

  res.status(201).json({ message: 'Solicitud enviada. Un administrador revisara tu cuenta.' });
}