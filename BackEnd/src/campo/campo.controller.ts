import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Campo } from './campo.entity.js';

export async function listarCampos(req: Request, res: Response) {
  const em = getEM();
  const campos = await em.find(Campo, { deleted_at: null });
  res.json(campos);
}

export async function obtenerCampo(req: Request, res: Response) {
  const em = getEM();
  const campo = await em.findOne(Campo, { id_campo: Number(req.params.id), deleted_at: null });
  if (!campo) return res.status(404).json({ error: 'Campo no encontrado' });
  res.json(campo);
}

export async function crearCampo(req: Request, res: Response) {
  const em = getEM();
  const { nro_campo, ubicacion } = req.body;
  if (!nro_campo || !ubicacion) {
    return res.status(400).json({ error: 'nro_campo y ubicacion son requeridos' });
  }
  const campo = em.create(Campo, { nro_campo, ubicacion });
  em.persist(campo);
  await em.flush();
  res.status(201).json(campo);
}

export async function actualizarCampo(req: Request, res: Response) {
  const em = getEM();
  const campo = await em.findOne(Campo, { id_campo: Number(req.params.id), deleted_at: null });
  if (!campo) return res.status(404).json({ error: 'Campo no encontrado' });

  em.assign(campo, req.body);
  await em.flush();
  res.json(campo);
}

export async function eliminarCampo(req: Request, res: Response) {
  const em = getEM();
  const campo = await em.findOne(Campo, { id_campo: Number(req.params.id), deleted_at: null });
  if (!campo) return res.status(404).json({ error: 'Campo no encontrado' });

  campo.deleted_at = new Date();
  await em.flush();
  res.status(204).send();
}
