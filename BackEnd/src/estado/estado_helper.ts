import type { EntityManager } from '@mikro-orm/core';
import { Estado } from './estado.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { Partida } from '../partida/partida.entity.js';

/**
 * Cierra el estado abierto actual (si existe) de un Lote o Partida y abre
 * uno nuevo. Se usa desde los controllers de negocio (Lote, ControlDeCalidad,
 * LimpiezaClasificacion, Partida) cada vez que un CUU produce una transicion
 * de estado. No exponer esto como endpoint HTTP directo.
 */
export async function cambiarEstado(
  em: EntityManager,
  target: { lote?: Lote; partida?: Partida },
  nombreNuevoEstado: string,
): Promise<Estado> {
  const filtro: any = { fecha_hasta: null, deleted_at: null };
  if (target.lote) filtro.lote = target.lote.id_lote;
  if (target.partida) filtro.partida = target.partida.id_partida;

  const abierto = await em.findOne(Estado, filtro);
  if (abierto) {
    abierto.fecha_hasta = new Date();
  }

  const nuevo = em.create(Estado, {
    nombre: nombreNuevoEstado,
    fecha_desde: new Date(),
    lote: target.lote,
    partida: target.partida,
  });
  em.persist(nuevo);
  return nuevo;
}
