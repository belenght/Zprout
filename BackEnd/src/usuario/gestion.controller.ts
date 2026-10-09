import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Usuario } from './usuario.entity.js';
import { Rol } from '../rol/rol.entity.js';
import { hashPassword } from '../auth/auth.service.js';
import { registrarBitacora } from '../bitacora/bitacora.helper.js';

/**
 * Gestion de usuarios (SOLO administrador; el router aplica verificarRol).
 * Reglas:
 *  - Sobre la propia cuenta no se opera desde aca (para eso esta "Mi perfil"),
 *    asi no se invalida el token de quien esta usando la pantalla.
 *  - Nunca se puede dejar el sistema sin un administrador activo.
 *  - El estado de alta (pendiente / rechazado) sigue siendo de "Solicitudes".
 */

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72; // bcrypt solo mira los primeros 72 bytes
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIN_MARKUP = /^[^<>]*$/;
const USUARIO_PATTERN = /^[A-Za-z0-9_.-]{3,50}$/;
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ROL_ADMIN = 'administrador';

function fechaComoTexto(valor: unknown): string | null {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
}

function fotoComoDataUrl(usuario: Usuario): string | null {
  if (!usuario.foto_perfil || usuario.foto_perfil.length === 0) return null;
  return `data:image/jpeg;base64,${Buffer.from(usuario.foto_perfil).toString('base64')}`;
}

// Nunca se devuelve password ni la foto en el listado (pesa); el detalle trae la foto aparte.
function filaDe(u: Usuario) {
  return {
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    apellido: u.apellido,
    nombre_usuario: u.nombre_usuario,
    email: u.email,
    fecha_nacimiento: fechaComoTexto(u.fecha_nacimiento),
    estado: u.estado,
    activo: u.activo,
    rol: u.rol ? { id_rol: u.rol.id_rol, desc_rol: u.rol.desc_rol } : null,
    rol_solicitado: u.rol_solicitado ? { id_rol: u.rol_solicitado.id_rol, desc_rol: u.rol_solicitado.desc_rol } : null,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

async function buscar(req: Request, res: Response): Promise<Usuario | null> {
  const em = getEM();
  const id = Number(req.params.id);
  const usuario = Number.isInteger(id)
    ? await em.findOne(Usuario, { id_usuario: id, deleted_at: null }, { populate: ['rol', 'rol_solicitado'] })
    : null;
  if (!usuario) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return null;
  }
  if (usuario.id_usuario === req.usuario?.id_usuario) {
    res.status(400).json({ error: 'Tu propia cuenta se edita desde "Mi perfil"' });
    return null;
  }
  return usuario;
}

/** Es el ultimo administrador activo del sistema? (para no dejarlo sin ninguno) */
async function esUltimoAdmin(usuario: Usuario): Promise<boolean> {
  if (usuario.rol?.desc_rol !== ROL_ADMIN || !usuario.activo) return false;
  const otros = await getEM().count(Usuario, {
    rol: { desc_rol: ROL_ADMIN },
    activo: true,
    deleted_at: null,
    id_usuario: { $ne: usuario.id_usuario },
  });
  return otros === 0;
}

export async function listar(_req: Request, res: Response) {
  const em = getEM();
  const usuarios = await em.find(
    Usuario,
    { deleted_at: null },
    { populate: ['rol', 'rol_solicitado'], orderBy: { apellido: 'ASC', nombre: 'ASC' } },
  );
  res.json(usuarios.map(filaDe));
}

export async function detalle(req: Request, res: Response) {
  const em = getEM();
  const id = Number(req.params.id);
  const usuario = Number.isInteger(id)
    ? await em.findOne(Usuario, { id_usuario: id, deleted_at: null }, { populate: ['rol', 'rol_solicitado'] })
    : null;
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ ...filaDe(usuario), foto: fotoComoDataUrl(usuario) });
}

export async function actualizar(req: Request, res: Response) {
  const usuario = await buscar(req, res);
  if (!usuario) return;
  const em = getEM();
  const { nombre, apellido, email, fecha_nacimiento, nombre_usuario, id_rol, activo } = req.body ?? {};
  const antes = {
    usuario: usuario.nombre_usuario, rol: usuario.rol?.desc_rol ?? null, activo: usuario.activo,
    nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email,
  };

  if (nombre !== undefined) {
    const v = String(nombre).trim();
    if (!v || v.length > 80 || !SIN_MARKUP.test(v)) return res.status(400).json({ error: 'nombre invalido' });
    usuario.nombre = v;
  }
  if (apellido !== undefined) {
    const v = String(apellido).trim();
    if (!v || v.length > 80 || !SIN_MARKUP.test(v)) return res.status(400).json({ error: 'apellido invalido' });
    usuario.apellido = v;
  }
  if (email !== undefined) {
    const v = String(email).trim();
    if (!EMAIL_PATTERN.test(v) || v.length > 120) return res.status(400).json({ error: 'email invalido' });
    if (v !== usuario.email) {
      // Sin filtrar deleted_at: el unique de la tabla tambien incluye filas dadas de baja.
      const otro = await em.findOne(Usuario, { email: v, id_usuario: { $ne: usuario.id_usuario } });
      if (otro) return res.status(409).json({ error: 'Ese email ya esta en uso' });
      usuario.email = v;
    }
  }
  if (nombre_usuario !== undefined) {
    const v = String(nombre_usuario).trim();
    if (!USUARIO_PATTERN.test(v)) {
      return res.status(400).json({ error: 'nombre_usuario invalido (3 a 50 caracteres: letras, numeros, punto, guion o guion bajo)' });
    }
    if (v !== usuario.nombre_usuario) {
      const otro = await em.findOne(Usuario, { nombre_usuario: v, id_usuario: { $ne: usuario.id_usuario } });
      if (otro) return res.status(409).json({ error: 'Ese nombre de usuario ya esta en uso' });
      usuario.nombre_usuario = v;
    }
  }
  if (fecha_nacimiento !== undefined) {
    if (fecha_nacimiento === null || fecha_nacimiento === '') {
      usuario.fecha_nacimiento = null as unknown as undefined;
    } else {
      const texto = String(fecha_nacimiento);
      const fecha = new Date(`${texto}T00:00:00Z`);
      if (!FECHA_PATTERN.test(texto) || Number.isNaN(fecha.getTime()) || fecha.getTime() > Date.now()) {
        return res.status(400).json({ error: 'fecha_nacimiento invalida' });
      }
      usuario.fecha_nacimiento = texto as unknown as Date;
    }
  }

  // Rol y habilitacion: ambos pueden dejar al sistema sin administrador.
  const quitaAdmin = async () => {
    if (await esUltimoAdmin(usuario)) {
      res.status(409).json({ error: 'Es el unico administrador activo: asigná otro administrador antes' });
      return true;
    }
    return false;
  };
  if (id_rol !== undefined && Number(id_rol) !== usuario.rol?.id_rol) {
    const rol = await em.findOne(Rol, { id_rol: Number(id_rol), deleted_at: null });
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    if (rol.desc_rol !== ROL_ADMIN && (await quitaAdmin())) return;
    usuario.rol = rol;
  }
  if (activo !== undefined) {
    if (typeof activo !== 'boolean') return res.status(400).json({ error: 'activo debe ser true o false' });
    if (!activo && usuario.activo && (await quitaAdmin())) return;
    usuario.activo = activo;
  }

  const cambios: string[] = [];
  if (antes.usuario !== usuario.nombre_usuario) cambios.push(`usuario: ${antes.usuario} -> ${usuario.nombre_usuario}`);
  if (antes.rol !== (usuario.rol?.desc_rol ?? null)) cambios.push(`rol: ${antes.rol ?? 'sin rol'} -> ${usuario.rol?.desc_rol ?? 'sin rol'}`);
  if (antes.activo !== usuario.activo) cambios.push(usuario.activo ? 'cuenta habilitada' : 'cuenta deshabilitada');
  if (antes.email !== usuario.email) cambios.push('email modificado');
  if (antes.nombre !== usuario.nombre || antes.apellido !== usuario.apellido) cambios.push('nombre modificado');
  if (cambios.length > 0) registrarBitacora(req, 'usuario.editar', `@${usuario.nombre_usuario}`, cambios.join('; '));

  await em.flush();
  res.json({ ...filaDe(usuario), foto: fotoComoDataUrl(usuario) });
}

/** Restablece la contrasena de otra persona (no exige la actual: es del administrador). */
export async function restablecerPassword(req: Request, res: Response) {
  const usuario = await buscar(req, res);
  if (!usuario) return;
  const { password_nueva, password_repetida } = req.body ?? {};
  if (typeof password_nueva !== 'string' || password_nueva.length < PASSWORD_MIN || password_nueva.length > PASSWORD_MAX) {
    return res.status(400).json({ error: `La contraseña nueva debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres` });
  }
  if (password_nueva !== password_repetida) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }
  usuario.password = await hashPassword(password_nueva);
  registrarBitacora(req, 'usuario.password', `@${usuario.nombre_usuario}`, 'Contraseña restablecida por un administrador');
  await getEM().flush();
  res.json({ ok: true });
}

export async function eliminar(req: Request, res: Response) {
  const usuario = await buscar(req, res);
  if (!usuario) return;
  if (await esUltimoAdmin(usuario)) {
    return res.status(409).json({ error: 'Es el unico administrador activo: no se puede eliminar' });
  }
  usuario.deleted_at = new Date();
  registrarBitacora(req, 'usuario.eliminar', `@${usuario.nombre_usuario}`, `${usuario.nombre} ${usuario.apellido} (${usuario.email})`);
  await getEM().flush();
  res.status(204).send();
}
