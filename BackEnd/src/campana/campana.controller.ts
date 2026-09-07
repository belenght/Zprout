import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Campana } from './campana.entity.js';

export async function listarCampanas(req: Request, res: Response) {
  const em = getEM();
  const campanas = await em.find(Campana, { deleted_at: null });
  res.json(campanas);
}

export async function obtenerCampanaVigente(req: Request, res: Response) {
  const em = getEM();
  const campana = await em.findOne(Campana, { vigente: true, deleted_at: null });
  if (!campana) return res.status(404).json({ error: 'No hay campana vigente configurada' });
  res.json(campana);
}

export async function crearCampana(req: Request, res: Response) {
  const em = getEM();
  const { nombre, fecha_inicio, fecha_fin, vigente } = req.body;
  if (!nombre || !fecha_inicio) {
    return res.status(400).json({ error: 'nombre y fecha_inicio son requeridos' });
  }

  // Si esta nueva campana se marca vigente, desmarca cualquier otra
  // (regla implicita: solo puede haber una campana vigente a la vez, CUU08)
  if (vigente) {
    await em.nativeUpdate(Campana, { vigente: true }, { vigente: false });
  }

  const campana = em.create(Campana, { nombre, fecha_inicio, fecha_fin, vigente: !!vigente });
  em.persist(campana);
  await em.flush();
  res.status(201).json(campana);
}

export async function actualizarCampana(req: Request, res: Response) {
  const em = getEM();
  const campana = await em.findOne(Campana, { id_campana: Number(req.params.id), deleted_at: null });
  if (!campana) return res.status(404).json({ error: 'Campana no encontrada' });

  if (req.body.vigente === true) {
    await em.nativeUpdate(Campana, { vigente: true }, { vigente: false });
  }

  em.assign(campana, req.body);
  await em.flush();
  res.json(campana);
}

export async function eliminarCampana(req: Request, res: Response) {
  const em = getEM();
  const campana = await em.findOne(Campana, { id_campana: Number(req.params.id), deleted_at: null });
  if (!campana) return res.status(404).json({ error: 'Campana no encontrada' });

  campana.deleted_at = new Date();
  await em.flush();
  res.status(204).send();
}
