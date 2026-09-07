import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Almacen, TipoAlmacen } from './almacen.entity.js';

export async function listarAlmacenes(req: Request, res: Response) {
  const em = getEM();
  const almacenes = await em.find(Almacen, { deleted_at: null });
  res.json(almacenes);
}

export async function obtenerAlmacen(req: Request, res: Response) {
  const em = getEM();
  const almacen = await em.findOne(Almacen, { id_almacen: Number(req.params.id), deleted_at: null });
  if (!almacen) return res.status(404).json({ error: 'Almacen no encontrado' });
  res.json(almacen);
}

export async function crearAlmacen(req: Request, res: Response) {
  const em = getEM();
  const { tipo, capacidad } = req.body;
  if (!tipo || !Object.values(TipoAlmacen).includes(tipo)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${Object.values(TipoAlmacen).join(', ')}` });
  }
  const almacen = em.create(Almacen, { tipo, capacidad });
  em.persist(almacen);
  await em.flush();
  res.status(201).json(almacen);
}

export async function actualizarAlmacen(req: Request, res: Response) {
  const em = getEM();
  const almacen = await em.findOne(Almacen, { id_almacen: Number(req.params.id), deleted_at: null });
  if (!almacen) return res.status(404).json({ error: 'Almacen no encontrado' });

  em.assign(almacen, req.body);
  await em.flush();
  res.json(almacen);
}

export async function eliminarAlmacen(req: Request, res: Response) {
  const em = getEM();
  const almacen = await em.findOne(Almacen, { id_almacen: Number(req.params.id), deleted_at: null });
  if (!almacen) return res.status(404).json({ error: 'Almacen no encontrado' });

  almacen.deleted_at = new Date();
  await em.flush();
  res.status(204).send();
}
