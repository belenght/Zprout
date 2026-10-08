import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Campana } from './campana.entity.js';

const NOMBRE_MAX = 60;

function validarFechas(fecha_inicio: unknown, fecha_fin: unknown): string | null {
  if (fecha_fin == null || fecha_inicio == null) return null;
  const inicio = new Date(fecha_inicio as string);
  const fin = new Date(fecha_fin as string);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return 'fecha_inicio/fecha_fin invalidas';
  if (fin < inicio) return 'fecha_fin no puede ser anterior a fecha_inicio';
  return null;
}

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
  if (String(nombre).length > NOMBRE_MAX) {
    return res.status(400).json({ error: `nombre no puede superar los ${NOMBRE_MAX} caracteres` });
  }
  const errorFechas = validarFechas(fecha_inicio, fecha_fin);
  if (errorFechas) return res.status(400).json({ error: errorFechas });
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
  const { nombre, fecha_inicio, fecha_fin, vigente } = req.body;
  if (nombre !== undefined && String(nombre).length > NOMBRE_MAX) {
    return res.status(400).json({ error: `nombre no puede superar los ${NOMBRE_MAX} caracteres` });
  }
  const errorFechas = validarFechas(fecha_inicio ?? campana.fecha_inicio, fecha_fin ?? campana.fecha_fin);
  if (errorFechas) return res.status(400).json({ error: errorFechas });
  if (vigente === true) {
    await em.nativeUpdate(Campana, { vigente: true }, { vigente: false });
  }
  if (nombre !== undefined) campana.nombre = nombre;
  if (fecha_inicio !== undefined) campana.fecha_inicio = fecha_inicio;
  if (fecha_fin !== undefined) campana.fecha_fin = fecha_fin;
  if (vigente !== undefined) campana.vigente = !!vigente;
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
