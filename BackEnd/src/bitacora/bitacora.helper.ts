import type { Request } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Bitacora } from './bitacora.entity.js';

/**
 * Agrega un renglon a la bitacora. Se persiste junto con el flush de la
 * accion que lo origina (mismo EntityManager), asi que queda registrado solo
 * si la accion se concreta.
 */
export function registrarBitacora(
  req: Request,
  accion: string,
  objetivo?: string,
  detalle?: string,
): void {
  const em = getEM();
  em.persist(em.create(Bitacora, {
    id_usuario_actor: req.usuario?.id_usuario,
    usuario_actor: req.usuario?.nombre_usuario ?? 'desconocido',
    accion,
    objetivo,
    detalle,
  }));
}
