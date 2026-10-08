import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { TipoDeSemilla } from './tipo_semilla.entity.js';

const NOMBRE_MAX = 80;

type RangoKey = 'humedad' | 'poder_germinativo' | 'nivel_pureza';
const RANGOS: RangoKey[] = ['humedad', 'poder_germinativo', 'nivel_pureza'];

/** Valida que, para cada rango presente, min <= max y ambos sean numeros >= 0. */
function validarRangos(body: Record<string, unknown>): string | null {
  for (const key of RANGOS) {
    const min = body[`${key}_min`];
    const max = body[`${key}_max`];
    if (min != null && (!Number.isFinite(Number(min)) || Number(min) < 0)) {
      return `${key}_min debe ser un numero mayor o igual a 0`;
    }
    if (max != null && (!Number.isFinite(Number(max)) || Number(max) < 0)) {
      return `${key}_max debe ser un numero mayor o igual a 0`;
    }
    if (min != null && max != null && Number(min) > Number(max)) {
      return `${key}_min no puede ser mayor a ${key}_max`;
    }
  }
  return null;
}

export async function listarTiposSemilla(req: Request, res: Response) {
  const em = getEM();
  const tipos = await em.find(TipoDeSemilla, { deleted_at: null });
  res.json(tipos);
}
export async function obtenerTipoSemilla(req: Request, res: Response) {
  const em = getEM();
  const tipo = await em.findOne(TipoDeSemilla, { id_semilla: Number(req.params.id), deleted_at: null });
  if (!tipo) return res.status(404).json({ error: 'TipoDeSemilla no encontrado' });
  res.json(tipo);
}
export async function crearTipoSemilla(req: Request, res: Response) {
  const em = getEM();
  const {
    nombre_semilla, variante_semilla,
    humedad_min, humedad_max,
    poder_germinativo_min, poder_germinativo_max,
    nivel_pureza_min, nivel_pureza_max,
    duracion,
  } = req.body;
  if (!nombre_semilla || !variante_semilla) {
    return res.status(400).json({ error: 'nombre_semilla y variante_semilla son requeridos' });
  }
  if (nombre_semilla.length > NOMBRE_MAX || variante_semilla.length > NOMBRE_MAX) {
    return res.status(400).json({ error: `nombre_semilla y variante_semilla no pueden superar los ${NOMBRE_MAX} caracteres` });
  }
  // Antes solo se validaba coherencia (min <= max) para humedad; PG y pureza
  // se guardaban sin chequear, incluso si venian invertidos o negativos.
  const errorRangos = validarRangos(req.body);
  if (errorRangos) return res.status(400).json({ error: errorRangos });
  if (duracion != null && (!Number.isFinite(Number(duracion)) || Number(duracion) <= 0)) {
    return res.status(400).json({ error: 'duracion debe ser un numero mayor a 0' });
  }
  const tipo = em.create(TipoDeSemilla, {
    nombre_semilla, variante_semilla,
    humedad_min, humedad_max,
    poder_germinativo_min, poder_germinativo_max,
    nivel_pureza_min, nivel_pureza_max,
    duracion,
  });
  em.persist(tipo);
  await em.flush();
  res.status(201).json(tipo);
}
export async function actualizarTipoSemilla(req: Request, res: Response) {
  const em = getEM();
  const tipo = await em.findOne(TipoDeSemilla, { id_semilla: Number(req.params.id), deleted_at: null });
  if (!tipo) return res.status(404).json({ error: 'TipoDeSemilla no encontrado' });

  const errorRangos = validarRangos(req.body);
  if (errorRangos) return res.status(400).json({ error: errorRangos });

  const camposDecimales = [
    'humedad_min', 'humedad_max',
    'poder_germinativo_min', 'poder_germinativo_max',
    'nivel_pureza_min', 'nivel_pureza_max',
  ] as const;
  const cambios: Record<string, unknown> = { ...req.body };
  for (const campo of camposDecimales) {
    if (cambios[campo] != null) cambios[campo] = String(cambios[campo]);
  }
  if (typeof cambios.nombre_semilla === 'string' && cambios.nombre_semilla.length > NOMBRE_MAX) {
    return res.status(400).json({ error: `nombre_semilla no puede superar los ${NOMBRE_MAX} caracteres` });
  }
  if (typeof cambios.variante_semilla === 'string' && cambios.variante_semilla.length > NOMBRE_MAX) {
    return res.status(400).json({ error: `variante_semilla no puede superar los ${NOMBRE_MAX} caracteres` });
  }
  em.assign(tipo, cambios);
  await em.flush();
  res.json(tipo);
}
export async function eliminarTipoSemilla(req: Request, res: Response) {
  const em = getEM();
  const tipo = await em.findOne(TipoDeSemilla, { id_semilla: Number(req.params.id), deleted_at: null });
  if (!tipo) return res.status(404).json({ error: 'TipoDeSemilla no encontrado' });
  tipo.deleted_at = new Date();
  await em.flush();
  res.status(204).send();
}
