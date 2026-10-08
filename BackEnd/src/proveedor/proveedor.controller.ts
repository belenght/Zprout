import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Proveedor } from './proveedor.entity.js';

const RAZON_SOCIAL_MAX = 150;
const CONTACTO_MAX = 150;
const CUIT_PATTERN = /^\d{2}-?\d{8}-?\d{1}$/;

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
  if (String(razon_social).length > RAZON_SOCIAL_MAX) {
    return res.status(400).json({ error: `razon_social no puede superar los ${RAZON_SOCIAL_MAX} caracteres` });
  }
  if (cuit != null && !CUIT_PATTERN.test(String(cuit))) {
    return res.status(400).json({ error: 'cuit invalido (formato esperado: 20-12345678-9)' });
  }
  if (contacto != null && String(contacto).length > CONTACTO_MAX) {
    return res.status(400).json({ error: `contacto no puede superar los ${CONTACTO_MAX} caracteres` });
  }
  const proveedor = em.create(Proveedor, { razon_social, cuit, contacto });
  em.persist(proveedor);
  await em.flush();
  res.status(201).json(proveedor);
}
export async function actualizarProveedor(req: Request, res: Response) {
  const em = getEM();
  const proveedor = await em.findOne(Proveedor, { id_proveedor: Number(req.params.id), deleted_at: null });
  if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
  const { razon_social, cuit, contacto } = req.body;
  if (razon_social !== undefined && String(razon_social).length > RAZON_SOCIAL_MAX) {
    return res.status(400).json({ error: `razon_social no puede superar los ${RAZON_SOCIAL_MAX} caracteres` });
  }
  if (cuit !== undefined && cuit != null && !CUIT_PATTERN.test(String(cuit))) {
    return res.status(400).json({ error: 'cuit invalido (formato esperado: 20-12345678-9)' });
  }
  if (contacto !== undefined && contacto != null && String(contacto).length > CONTACTO_MAX) {
    return res.status(400).json({ error: `contacto no puede superar los ${CONTACTO_MAX} caracteres` });
  }
  if (razon_social !== undefined) proveedor.razon_social = razon_social;
  if (cuit !== undefined) proveedor.cuit = cuit;
  if (contacto !== undefined) proveedor.contacto = contacto;
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
