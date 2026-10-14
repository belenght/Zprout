import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Almacen, TipoAlmacen } from './almacen.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { Partida } from '../partida/partida.entity.js';

const CAPACIDAD_MIN = 0.01;

/**
 * "Ocupado" no es una columna propia de Almacen: se calcula sumando lo que
 * hay hoy asignado ahi (ver Lote.almacen, seteado via PATCH /lotes/:id/almacen).
 * Se suma lo que queda a granel de cada Lote (total menos lo ya curado en Partidas). Solo Lote -- el Modelo de Dominio (ver Copia_de_Modelo_de_dominio_Zprout)
 * no define ninguna relacion entre Partida y Almacen, asi que no se inventa una
 * aca: los almacenes de tipo 'deposito' (pensados para bolsas ya envasadas)
 * no tienen forma de calcular ocupacion real hasta que esa relacion se agregue
 * formalmente al modelo.
 */
async function conOcupacion(em: ReturnType<typeof getEM>, almacenes: Almacen[]) {
  if (almacenes.length === 0) return [];
  const ids = almacenes.map((a) => a.id_almacen);
  const lotes = await em.find(Lote, { almacen: { id_almacen: { $in: ids } }, deleted_at: null }, { populate: ['almacen'] });
  // Lo que ya se curo pasa a bolsas y deja de ocupar el almacen a granel:
  // se resta el volumen de las partidas generadas de cada lote.
  const partidas = lotes.length
    ? await em.find(Partida, { lote: { id_lote: { $in: lotes.map((l) => l.id_lote) } }, deleted_at: null })
    : [];
  const curadoPorLote = new Map<number, number>();
  for (const p of partidas) curadoPorLote.set(p.lote.id_lote, (curadoPorLote.get(p.lote.id_lote) ?? 0) + Number(p.volumen_en_tn));

  const tnPorAlmacen = new Map<number, number>();
  for (const lote of lotes) {
    const id = lote.almacen!.id_almacen;
    const aGranel = Math.max(Number(lote.cantidad_semillas_en_tn) - (curadoPorLote.get(lote.id_lote) ?? 0), 0);
    tnPorAlmacen.set(id, (tnPorAlmacen.get(id) ?? 0) + aGranel);
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
  // Antes "capacidad" no se validaba en absoluto: ni que viniera, ni que
  // fuera positiva. Se podia crear un almacen sin capacidad o con capacidad
  // negativa.
  const capacidadNum = Number(capacidad);
  if (!Number.isFinite(capacidadNum) || capacidadNum < CAPACIDAD_MIN) {
    return res.status(400).json({ error: `capacidad debe ser un numero mayor o igual a ${CAPACIDAD_MIN}` });
  }
  const almacen = em.create(Almacen, { tipo, capacidad: String(capacidadNum) });
  em.persist(almacen);
  await em.flush();
  res.status(201).json(almacen);
}
export async function actualizarAlmacen(req: Request, res: Response) {
  const em = getEM();
  const almacen = await em.findOne(Almacen, { id_almacen: Number(req.params.id), deleted_at: null });
  if (!almacen) return res.status(404).json({ error: 'Almacen no encontrado' });
  const { tipo, capacidad } = req.body;
  if (tipo !== undefined) {
    if (!Object.values(TipoAlmacen).includes(tipo)) {
      return res.status(400).json({ error: `tipo debe ser uno de: ${Object.values(TipoAlmacen).join(', ')}` });
    }
    almacen.tipo = tipo;
  }
  if (capacidad !== undefined) {
    const capacidadNum = Number(capacidad);
    if (!Number.isFinite(capacidadNum) || capacidadNum < CAPACIDAD_MIN) {
      return res.status(400).json({ error: `capacidad debe ser un numero mayor o igual a ${CAPACIDAD_MIN}` });
    }
    almacen.capacidad = String(capacidadNum);
  }
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