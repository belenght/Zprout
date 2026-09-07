import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Estado } from './estado.entity.js';

// Estado no tiene endpoints de escritura directos: los estados se generan
// como efecto de las acciones de negocio (CUU01, 02, 03, 05, 06), nunca por
// carga manual. Estos endpoints son de solo lectura, para historial/trazabilidad.

export async function historialPorLote(req: Request, res: Response) {
  const em = getEM();
  const estados = await em.find(
    Estado,
    { lote: { id_lote: Number(req.params.loteId) }, deleted_at: null },
    { orderBy: { fecha_desde: 'ASC' } },
  );
  res.json(estados);
}

export async function historialPorPartida(req: Request, res: Response) {
  const em = getEM();
  const estados = await em.find(
    Estado,
    { partida: { id_partida: Number(req.params.partidaId) }, deleted_at: null },
    { orderBy: { fecha_desde: 'ASC' } },
  );
  res.json(estados);
}

export async function estadoActualLote(req: Request, res: Response) {
  const em = getEM();
  const estado = await em.findOne(
    Estado,
    { lote: { id_lote: Number(req.params.loteId) }, fecha_hasta: null, deleted_at: null },
    { orderBy: { fecha_desde: 'DESC' } },
  );
  if (!estado) return res.status(404).json({ error: 'El lote no tiene estado registrado' });
  res.json(estado);
}

export async function estadoActualPartida(req: Request, res: Response) {
  const em = getEM();
  const estado = await em.findOne(
    Estado,
    { partida: { id_partida: Number(req.params.partidaId) }, fecha_hasta: null, deleted_at: null },
    { orderBy: { fecha_desde: 'DESC' } },
  );
  if (!estado) return res.status(404).json({ error: 'La partida no tiene estado registrado' });
  res.json(estado);
}
