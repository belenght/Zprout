import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Usuario } from './usuario.entity.js';
import { Rol } from '../rol/rol.entity.js';
import { registrarBitacora } from '../bitacora/bitacora.helper.js';
import { comparePassword, generateToken, hashPassword } from '../auth/auth.service.js';

/**
 * "Mi perfil": endpoints del usuario logueado sobre SU PROPIA cuenta.
 * El id sale siempre del token (req.usuario), nunca del body ni de la URL,
 * para que nadie pueda editar la cuenta de otra persona por aca.
 */

const PASSWORD_MIN = 8;
// bcrypt solo mira los primeros 72 bytes: mas largo que eso no suma seguridad.
const PASSWORD_MAX = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIN_MARKUP = /^[^<>]*$/;
// Mismo criterio que el registro: sin espacios ni markup.
const USUARIO_PATTERN = /^[A-Za-z0-9_.-]{3,50}$/;
const ROL_ADMIN = 'administrador';
const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// express.json() (app.ts) corta en 100 kb por request; la foto viaja en base64
// (+33%), asi que 70 kb de imagen es el maximo que entra con margen.
const FOTO_MAX_BYTES = 70 * 1024;
const FOTO_DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+=*)$/;

async function usuarioActual(req: Request, res: Response): Promise<Usuario | null> {
  const id = req.usuario?.id_usuario;
  if (!id) {
    res.status(401).json({ error: 'Usuario autenticado no disponible' });
    return null;
  }
  const em = getEM();
  const usuario = await em.findOne(Usuario, { id_usuario: id, activo: true, deleted_at: null }, { populate: ['rol'] });
  if (!usuario) {
    res.status(401).json({ error: 'Usuario autenticado no disponible' });
    return null;
  }
  return usuario;
}

function fotoComoDataUrl(usuario: Usuario): string | null {
  if (!usuario.foto_perfil || usuario.foto_perfil.length === 0) return null;
  return `data:image/jpeg;base64,${Buffer.from(usuario.foto_perfil).toString('base64')}`;
}

function fechaComoTexto(valor: unknown): string | null {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
}

function perfilDe(usuario: Usuario) {
  return {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    nombre_usuario: usuario.nombre_usuario,
    email: usuario.email,
    fecha_nacimiento: fechaComoTexto(usuario.fecha_nacimiento),
    rol: usuario.rol?.desc_rol ?? null,
    id_rol: usuario.rol?.id_rol ?? null,
    estado: usuario.estado,
    created_at: usuario.created_at,
    foto: fotoComoDataUrl(usuario),
  };
}

function tokenDe(usuario: Usuario): string {
  return generateToken({
    id_usuario: usuario.id_usuario,
    nombre_usuario: usuario.nombre_usuario,
    nombre: usuario.nombre,
    rol: usuario.rol?.desc_rol ?? null,
  });
}

export async function obtenerMiPerfil(req: Request, res: Response) {
  const usuario = await usuarioActual(req, res);
  if (!usuario) return;
  res.json(perfilDe(usuario));
}

/**
 * Datos personales. Se pueden cambiar nombre, apellido, email y fecha de
 * nacimiento. El nombre de usuario y el rol SOLO los puede cambiar un
 * administrador (se valida contra la base, no contra el token).
 * Devuelve un token nuevo porque el nombre, el usuario y el rol viajan en el JWT.
 */
export async function actualizarMiPerfil(req: Request, res: Response) {
  const usuario = await usuarioActual(req, res);
  if (!usuario) return;
  const em = getEM();
  const { nombre, apellido, email, fecha_nacimiento, nombre_usuario, id_rol } = req.body ?? {};
  const esAdmin = usuario.rol?.desc_rol === ROL_ADMIN;

  if ((nombre_usuario !== undefined || id_rol !== undefined) && !esAdmin) {
    return res.status(403).json({ error: 'Solo un administrador puede cambiar el nombre de usuario o el rol' });
  }

  if (nombre_usuario !== undefined) {
    const v = String(nombre_usuario).trim();
    if (!USUARIO_PATTERN.test(v)) {
      return res.status(400).json({ error: 'nombre_usuario invalido (3 a 50 caracteres: letras, numeros, punto, guion o guion bajo)' });
    }
    if (v !== usuario.nombre_usuario) {
      // Sin filtrar deleted_at: el unique de la tabla tambien incluye filas dadas de baja.
      const otro = await em.findOne(Usuario, { nombre_usuario: v, id_usuario: { $ne: usuario.id_usuario } });
      if (otro) return res.status(409).json({ error: 'Ese nombre de usuario ya esta en uso' });
      registrarBitacora(req, 'usuario.editar', `@${usuario.nombre_usuario}`, `Cambió su propio usuario a ${v}`);
      usuario.nombre_usuario = v;
    }
  }

  if (id_rol !== undefined && Number(id_rol) !== usuario.rol?.id_rol) {
    const rol = await em.findOne(Rol, { id_rol: Number(id_rol), deleted_at: null });
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    if (rol.desc_rol !== ROL_ADMIN) {
      // Evita que el sistema se quede sin administradores.
      const otrosAdmins = await em.count(Usuario, {
        rol: { desc_rol: ROL_ADMIN },
        activo: true,
        deleted_at: null,
        id_usuario: { $ne: usuario.id_usuario },
      });
      if (otrosAdmins === 0) {
        return res.status(409).json({ error: 'Sos el unico administrador: asigná otro administrador antes de cambiar tu rol' });
      }
    }
    registrarBitacora(req, 'usuario.editar', `@${usuario.nombre_usuario}`, `Cambió su propio rol: ${usuario.rol?.desc_rol ?? 'sin rol'} -> ${rol.desc_rol}`);
    usuario.rol = rol;
  }

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
    // Sin filtrar deleted_at: el unique de la tabla tambien incluye filas dadas de baja.
    const otro = await em.findOne(Usuario, { email: v, id_usuario: { $ne: usuario.id_usuario } });
    if (otro) return res.status(409).json({ error: 'Ese email ya esta en uso' });
    usuario.email = v;
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

  await em.flush();
  res.json({ perfil: perfilDe(usuario), token: tokenDe(usuario) });
}

/** Cambio de contrasena: exige la actual (si alguien deja la sesion abierta, no alcanza). */
export async function cambiarMiPassword(req: Request, res: Response) {
  const usuario = await usuarioActual(req, res);
  if (!usuario) return;
  const { password_actual, password_nueva, password_repetida } = req.body ?? {};

  if (!password_actual || !password_nueva || !password_repetida) {
    return res.status(400).json({ error: 'Completa todos los campos' });
  }
  if (typeof password_nueva !== 'string' || password_nueva.length < PASSWORD_MIN) {
    return res.status(400).json({ error: `La contraseña nueva debe tener al menos ${PASSWORD_MIN} caracteres` });
  }
  if (password_nueva.length > PASSWORD_MAX) {
    return res.status(400).json({ error: `La contraseña nueva no puede superar los ${PASSWORD_MAX} caracteres` });
  }
  if (password_nueva !== password_repetida) {
    return res.status(400).json({ error: 'Las contraseñas nuevas no coinciden' });
  }
  if (!(await comparePassword(String(password_actual), usuario.password))) {
    // 400 y no 401: un 401 haria que el front crea que se vencio la sesion.
    return res.status(400).json({ error: 'La contraseña actual no es correcta' });
  }
  if (password_nueva === password_actual) {
    return res.status(400).json({ error: 'La contraseña nueva tiene que ser distinta de la actual' });
  }

  usuario.password = await hashPassword(password_nueva);
  await getEM().flush();
  res.json({ message: 'Contraseña actualizada' });
}

/**
 * Foto de perfil. El front la recorta, la achica y la manda como JPEG en
 * base64 (data URL). Aca se valida de nuevo: no se confia en el cliente.
 */
export async function subirMiFoto(req: Request, res: Response) {
  const usuario = await usuarioActual(req, res);
  if (!usuario) return;

  const imagen = req.body?.imagen;
  const coincide = typeof imagen === 'string' ? FOTO_DATA_URL.exec(imagen) : null;
  if (!coincide) return res.status(400).json({ error: 'La imagen debe ser un JPEG valido' });

  const buffer = Buffer.from(coincide[1], 'base64');
  if (buffer.length === 0 || buffer.length > FOTO_MAX_BYTES) {
    return res.status(400).json({ error: `La imagen no puede superar los ${FOTO_MAX_BYTES / 1024} KB` });
  }
  // Firma de un JPEG (FF D8 FF): que el texto diga "jpeg" no prueba nada.
  if (!(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
    return res.status(400).json({ error: 'La imagen debe ser un JPEG valido' });
  }

  usuario.foto_perfil = buffer;
  await getEM().flush();
  res.json({ foto: fotoComoDataUrl(usuario) });
}

export async function eliminarMiFoto(req: Request, res: Response) {
  const usuario = await usuarioActual(req, res);
  if (!usuario) return;
  usuario.foto_perfil = null as unknown as undefined;
  await getEM().flush();
  res.status(204).send();
}
