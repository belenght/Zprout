import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Insumo } from './insumo.entity.js';

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
  const { nombre_insumo, unidad_medida } = req.body;
  if (!nombre_insumo) return res.status(400).json({ error: 'nombre_insumo es requerido' });

  // Evita duplicados: si ya existe, lo devuelve en vez de crear otro (util para
  // el flujo de GUI-10 "Crear insumo al vuelo" desde el buscador de curado)
  let insumo = await em.findOne(Insumo, { nombre_insumo, deleted_at: null });
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

  em.assign(insumo, req.body);
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
