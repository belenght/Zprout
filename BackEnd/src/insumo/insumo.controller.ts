import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Insumo } from './insumo.entity.js';

const NOMBRE_MIN = 2;
const NOMBRE_MAX = 80;
const UNIDAD_MAX = 20;

export async function listarInsumos(req: Request, res: Response) {
  const em = getEM();
  const insumos = await em.find(Insumo, { deleted_at: null });
  res.json(insumos);
}
export async function obtenerInsumo(req: Request, res: Response) {
  const em = getEM();
  const insumo = await em.findOne(Insumo, { id_insumo: Number(req.params.id), deleted_at: null });
  if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });
  res.json(insumo);
}
export async function crearInsumo(req: Request, res: Response) {
  const em = getEM();
  const nombreCrudo = req.body.nombre_insumo;
  const unidad_medida = req.body.unidad_medida;

  if (typeof nombreCrudo !== 'string' || !nombreCrudo.trim()) {
    return res.status(400).json({ error: 'nombre_insumo es requerido' });
  }
  const nombre_insumo = nombreCrudo.trim();
  if (nombre_insumo.length < NOMBRE_MIN || nombre_insumo.length > NOMBRE_MAX) {
    return res.status(400).json({ error: `nombre_insumo debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres` });
  }
  if (typeof unidad_medida === 'string' && unidad_medida.length > UNIDAD_MAX) {
    return res.status(400).json({ error: `unidad_medida no puede superar los ${UNIDAD_MAX} caracteres` });
  }

  // Evita duplicados: si ya existe (comparando sin importar mayusculas ni
  // espacios al principio/final), lo devuelve en vez de crear otro.
  // Antes esto era un findOne con el string crudo: "Fungicida" y
  // "fungicida " (con espacio) contaban como insumos distintos.
  const existentes = await em.find(Insumo, { deleted_at: null });
  const normalizar = (s: string) => s.trim().toLowerCase();
  let insumo = existentes.find((i) => normalizar(i.nombre_insumo) === normalizar(nombre_insumo)) ?? null;

  if (!insumo) {
    insumo = em.create(Insumo, { nombre_insumo, unidad_medida });
    em.persist(insumo);
    await em.flush();
    return res.status(201).json(insumo);
  }
  res.status(200).json(insumo);
}
export async function actualizarInsumo(req: Request, res: Response) {
  const em = getEM();
  const insumo = await em.findOne(Insumo, { id_insumo: Number(req.params.id), deleted_at: null });
  if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });

  // Whitelist explicito en vez de em.assign(insumo, req.body): asignar el
  // body entero sin filtrar deja que cualquier campo del body (incluidos
  // id_insumo, deleted_at, o lo que tenga la entity) se pise desde afuera.
  const { nombre_insumo, unidad_medida } = req.body;
  if (nombre_insumo !== undefined) {
    if (typeof nombre_insumo !== 'string' || !nombre_insumo.trim()) {
      return res.status(400).json({ error: 'nombre_insumo no puede estar vacio' });
    }
    const nombreTrim = nombre_insumo.trim();
    if (nombreTrim.length < NOMBRE_MIN || nombreTrim.length > NOMBRE_MAX) {
      return res.status(400).json({ error: `nombre_insumo debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres` });
    }
    insumo.nombre_insumo = nombreTrim;
  }
  if (unidad_medida !== undefined) {
    if (typeof unidad_medida === 'string' && unidad_medida.length > UNIDAD_MAX) {
      return res.status(400).json({ error: `unidad_medida no puede superar los ${UNIDAD_MAX} caracteres` });
    }
    insumo.unidad_medida = unidad_medida;
  }

  await em.flush();
  res.json(insumo);
}
export async function eliminarInsumo(req: Request, res: Response) {
  const em = getEM();
  const insumo = await em.findOne(Insumo, { id_insumo: Number(req.params.id), deleted_at: null });
  if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });
  insumo.deleted_at = new Date();
  await em.flush();
  res.status(204).send();
}
