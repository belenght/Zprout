import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Almacen, TipoAlmacen } from './almacen.entity.js';
import { Lote } from '../lote/lote.entity.js';

/**
 * "Ocupado" no es una columna propia de Almacen: se calcula sumando lo que
 * hay hoy asignado ahi (ver Lote.almacen, seteado via PATCH /lotes/:id/almacen).
 * Solo se suma Lote -- el Modelo de Dominio (ver Copia_de_Modelo_de_dominio_Zprout)
 * no define ninguna relacion entre Partida y Almacen, asi que no se inventa una
 * aca: los almacenes de tipo 'deposito' (pensados para bolsas ya envasadas)
 * no tienen forma de calcular ocupacion real hasta que esa relacion se agregue
 * formalmente al modelo.
 */
async function conOcupacion(em: ReturnType<typeof getEM>, almacenes: Almacen[]) {
  if (almacenes.length === 0) return [];
  const ids = almacenes.map((a) => a.id_almacen);

  const lotes = await em.find(Lote, { almacen: { id_almacen: { $in: ids } }, deleted_at: null }, { populate: ['almacen'] });

  const tnPorAlmacen = new Map<number, number>();
  for (const lote of lotes) {
    const id = lote.almacen!.id_almacen;
    tnPorAlmacen.set(id, (tnPorAlmacen.get(id) ?? 0) + Number(lote.cantidad_semillas_en_tn));
  }

  return almacenes.map((a) => ({ ...a, ocupado_tn: tnPorAlmacen.get(a.id_almacen) ?? 0 }));
}

export async function listarAlmacenes(req: Request, res: Response) {
  const em = getEM();
  const almacenes = await em.find(Almacen, { deleted_at: null });
  res.json(await conOcupacion(em, almacenes));
}

export async function obtenerAlmacen(req: Request, res: Response) {
  const em = getEM();
  const almacen = await em.findOne(Almacen, { id_almacen: Number(req.params.id), deleted_at: null });
  if (!almacen) return res.status(404).json({ error: 'Almacen no encontrado' });
  const [dto] = await conOcupacion(em, [almacen]);
  res.json(dto);
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
