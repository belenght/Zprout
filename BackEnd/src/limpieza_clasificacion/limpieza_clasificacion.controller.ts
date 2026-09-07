import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { LimpiezaClasificacion } from './limpieza_clasificacion.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Estado } from '../estado/estado.entity.js';
import { cambiarEstado } from '../estado/estado_helper.js';

export async function listarLimpiezasPorLote(req: Request, res: Response) {
  const em = getEM();
  const registros = await em.find(
    LimpiezaClasificacion,
    { lote: { id_lote: Number(req.params.loteId) }, deleted_at: null },
    { orderBy: { fecha: 'ASC' } },
  );
  res.json(registros);
}

/**
 * CUU03 - "Registrar limpieza y clasificación"
 * Precondicion (1.a): el lote debe estar en estado "En limpieza".
 * Paso 4: valida que volumen_restante + merma sea consistente con el volumen
 * ingresado originalmente en el Lote.
 * Paso 6: pasa el lote a estado "Para curar".
 */
export async function registrarLimpieza(req: Request, res: Response) {
  const em = getEM();
  const { lote_id, volumen_restante_tn, merma_tn, observaciones, operario_id } = req.body;

  if (!lote_id || volumen_restante_tn == null || merma_tn == null) {
    return res.status(400).json({ error: 'lote_id, volumen_restante_tn y merma_tn son requeridos' });
  }

  const lote = await em.findOne(Lote, { id_lote: lote_id, deleted_at: null });
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  // Alternativo 1.a: valida que el lote este en el estado correcto
  const estadoActual = await em.findOne(Estado, { lote: { id_lote: lote.id_lote }, fecha_hasta: null, deleted_at: null });
  if (!estadoActual || estadoActual.nombre !== 'En limpieza') {
    return res.status(409).json({
      error: `El lote no posee un estado valido para realizar la limpieza (estado actual: ${estadoActual?.nombre ?? 'sin estado'})`,
    });
  }

  // Alternativo 3.a: consistencia de volumen
  const volumenIngresado = Number(lote.cantidad_semillas_en_tn);
  const sumaProcesada = Number(volumen_restante_tn) + Number(merma_tn);
  if (sumaProcesada > volumenIngresado) {
    return res.status(400).json({
      error: `El volumen restante + merma (${sumaProcesada} tn) supera el volumen disponible del lote (${volumenIngresado} tn)`,
    });
  }

  let operario: Usuario | undefined;
  if (operario_id) {
    operario = await em.findOne(Usuario, { id_usuario: operario_id }) ?? undefined;
  }

  const limpieza = em.create(LimpiezaClasificacion, {
    lote,
    volumen_restante_tn,
    merma_tn,
    observaciones,
    operario,
  });
  em.persist(limpieza);

  // Paso 6: nuevo estado del lote
  await cambiarEstado(em, { lote }, 'Para curar');

  await em.flush();
  res.status(201).json(limpieza);
}
