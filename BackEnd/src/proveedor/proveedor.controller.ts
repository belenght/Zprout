import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Proveedor } from './proveedor.entity.js';

export async function listarProveedores(req: Request, res: Response) {
  const em = getEM();
  const proveedores = await em.find(Proveedor, { deleted_at: null });
  res.json(proveedores);
}

export async function obtenerProveedor(req: Request, res: Response) {
  const em = getEM();
  const proveedor = await em.findOne(Proveedor, { id_proveedor: Number(req.params.id), deleted_at: null });
  if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
  res.json(proveedor);
}

export async function crearProveedor(req: Request, res: Response) {
  const em = getEM();
  const { razon_social, cuit, contacto } = req.body;
  if (!razon_social) return res.status(400).json({ error: 'razon_social es requerido' });

  const proveedor = em.create(Proveedor, { razon_social, cuit, contacto });
  em.persist(proveedor);
  await em.flush();
  res.status(201).json(proveedor);
}

export async function actualizarProveedor(req: Request, res: Response) {
  const em = getEM();
  const proveedor = await em.findOne(Proveedor, { id_proveedor: Number(req.params.id), deleted_at: null });
  if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });

  em.assign(proveedor, req.body);
  await em.flush();
  res.json(proveedor);
}

export async function eliminarProveedor(req: Request, res: Response) {
  const em = getEM();
  const proveedor = await em.findOne(Proveedor, { id_proveedor: Number(req.params.id), deleted_at: null });
  if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });

  proveedor.deleted_at = new Date();
  await em.flush();
  res.status(204).send();
}
