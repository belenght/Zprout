import type { EntityManager } from '@mikro-orm/core';
import { Estado } from './estado.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { Partida } from '../partida/partida.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';

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
  usuario: Usuario,
): Promise<Estado> {
  const filtro: any = { fecha_hasta: null, deleted_at: null };
  const idLote = target.lote?.id_lote;
  const idPartida = target.partida?.id_partida;
  if (idLote != null) filtro.lote = idLote;
  if (idPartida != null) filtro.partida = idPartida;

  // Si el Lote/Partida todavia no tiene id (entidad nueva sin flush), no puede
  // tener un estado abierto. Sin este control el filtro quedaba sin lote ni
  // partida y cerraba el primer estado abierto de CUALQUIER otro lote.
  const tieneFiltroDeEntidad = idLote != null || idPartida != null;
  const abierto = tieneFiltroDeEntidad ? await em.findOne(Estado, filtro) : null;
  if (abierto) {
    abierto.fecha_hasta = new Date();
  }

  const nuevo = em.create(Estado, {
    nombre: nombreNuevoEstado,
    fecha_desde: new Date(),
    lote: target.lote,
    partida: target.partida,
    usuario,
  });
  em.persist(nuevo);
  return nuevo;
}
