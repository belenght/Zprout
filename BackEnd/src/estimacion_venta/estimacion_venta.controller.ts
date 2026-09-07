import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { EstimacionVenta } from './estimacion_venta.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { Campana } from '../campana/campana.entity.js';

export async function listarEstimacionesVenta(req: Request, res: Response) {
  const em = getEM();
  const filtro: any = { deleted_at: null };
  if (req.query.lote_id) filtro.lote = Number(req.query.lote_id);
  if (req.query.campana_id) filtro.campana = Number(req.query.campana_id);

  const estimaciones = await em.find(EstimacionVenta, filtro, { populate: ['lote', 'campana'] });
  res.json(estimaciones);
}

export async function crearEstimacionVenta(req: Request, res: Response) {
  const em = getEM();
  const { lote_id, campana_id, volumen_estimado_tn } = req.body;
  if (!lote_id || !campana_id || volumen_estimado_tn == null) {
    return res.status(400).json({ error: 'lote_id, campana_id y volumen_estimado_tn son requeridos' });
  }

  const lote = await em.findOne(Lote, { id_lote: lote_id, deleted_at: null });
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  const campana = await em.findOne(Campana, { id_campana: campana_id, deleted_at: null });
  if (!campana) return res.status(404).json({ error: 'Campana no encontrada' });

  const estimacion = em.create(EstimacionVenta, { lote, campana, volumen_estimado_tn });
  em.persist(estimacion);
  await em.flush();
  res.status(201).json(estimacion);
}

export async function actualizarEstimacionVenta(req: Request, res: Response) {
  const em = getEM();
  const estimacion = await em.findOne(EstimacionVenta, { id_estimacion: Number(req.params.id), deleted_at: null });
  if (!estimacion) return res.status(404).json({ error: 'EstimacionVenta no encontrada' });

  em.assign(estimacion, req.body);
  await em.flush();
  res.json(estimacion);
}

export async function eliminarEstimacionVenta(req: Request, res: Response) {
  const em = getEM();
  const estimacion = await em.findOne(EstimacionVenta, { id_estimacion: Number(req.params.id), deleted_at: null });
  if (!estimacion) return res.status(404).json({ error: 'EstimacionVenta no encontrada' });

  estimacion.deleted_at = new Date();
  await em.flush();
  res.status(204).send();
}
