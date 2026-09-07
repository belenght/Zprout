import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Rol } from './rol.entity.js';

export async function listarRoles(req: Request, res: Response) {
  const em = getEM();
  const roles = await em.find(Rol, { deleted_at: null });
  res.json(roles);
}

export async function obtenerRol(req: Request, res: Response) {
  const em = getEM();
  const rol = await em.findOne(Rol, { id_rol: Number(req.params.id), deleted_at: null });
  if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
  res.json(rol);
}

export async function crearRol(req: Request, res: Response) {
  const em = getEM();
  const { desc_rol } = req.body;
  if (!desc_rol) return res.status(400).json({ error: 'desc_rol es requerido' });

  const rol = em.create(Rol, { desc_rol });
  em.persist(rol);
  await em.flush();
  res.status(201).json(rol);
}

export async function actualizarRol(req: Request, res: Response) {
  const em = getEM();
  const rol = await em.findOne(Rol, { id_rol: Number(req.params.id), deleted_at: null });
  if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });

  em.assign(rol, req.body);
  await em.flush();
  res.json(rol);
}

export async function eliminarRol(req: Request, res: Response) {
  const em = getEM();
  const rol = await em.findOne(Rol, { id_rol: Number(req.params.id), deleted_at: null });
  if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });

  rol.deleted_at = new Date(); // soft delete
  await em.flush();
  res.status(204).send();
}
