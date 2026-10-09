import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Bitacora } from './bitacora.entity.js';

/** Solo administrador (ver controlarAcceso). Mas recientes primero. */
export async function listar(req: Request, res: Response) {
  const em = getEM();
  const limite = Math.min(Math.max(Number(req.query.limite) || 200, 1), 1000);
  const filtro: Record<string, unknown> = {};
  const accion = String(req.query.accion ?? '').trim();
  if (accion) filtro.accion = { $like: `${accion}%` };
  const usuario = String(req.query.usuario ?? '').trim();
  if (usuario) filtro.usuario_actor = usuario;
  const registros = await em.find(Bitacora, filtro, { orderBy: { fecha: 'DESC', id_bitacora: 'DESC' }, limit: limite });
  res.json(registros);
}
