import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { TipoDeSemilla } from './tipo_semilla.entity.js';

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
  // Validacion basica de coherencia de rangos
  if (humedad_min != null && humedad_max != null && Number(humedad_min) > Number(humedad_max)) {
    return res.status(400).json({ error: 'humedad_min no puede ser mayor a humedad_max' });
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

  em.assign(tipo, req.body);
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
