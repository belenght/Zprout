import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { ControlDeCalidad, TipoControl, ResultadoControl } from './control_calidad.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { cambiarEstado } from '../estado/estado_helper.js';

export async function listarControlesPorLote(req: Request, res: Response) {
  const em = getEM();
  const controles = await em.find(
    ControlDeCalidad,
    { lote: { id_lote: Number(req.params.loteId) }, deleted_at: null },
    { orderBy: { fecha: 'ASC' } },
  );
  res.json(controles);
}

/**
 * CUU02 - "Registrar Control de Calidad" (aplicado sobre Lote: inicial o intermedio).
 * El control final de Partida se maneja en partida_controller (CUU06), porque
 * ahi tambien se genera el Informe de Partida.
 *
 * Paso 3: valida contra los rangos de TipoDeSemilla.
 * Alternativo 3.a.1.b: fuera de rango + usuario confirma -> lote "No apto".
 */
export async function registrarControlCalidadLote(req: Request, res: Response) {
  const em = getEM();
  const {
    lote_id,
    tipo_control, // 'inicial' | 'intermedio'
    humedad,
    poder_germinativo,
    nivel_de_pureza,
    descripcion,
    confirmar_no_apto, // true si el usuario ya confirmo que el valor fuera de rango es correcto (3.a.1.b)
  } = req.body;

  if (!lote_id || !tipo_control || humedad == null || poder_germinativo == null || nivel_de_pureza == null) {
    return res.status(400).json({ error: 'lote_id, tipo_control, humedad, poder_germinativo y nivel_de_pureza son requeridos' });
  }
  if (![TipoControl.INICIAL, TipoControl.INTERMEDIO].includes(tipo_control)) {
    return res.status(400).json({ error: 'tipo_control debe ser "inicial" o "intermedio" en este endpoint' });
  }

  const lote = await em.findOne(Lote, { id_lote: lote_id, deleted_at: null }, { populate: ['tipo_semilla'] });
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  const ts = lote.tipo_semilla;
  const dentroDeRango =
    (ts.humedad_min == null || Number(humedad) >= Number(ts.humedad_min)) &&
    (ts.humedad_max == null || Number(humedad) <= Number(ts.humedad_max)) &&
    (ts.poder_germinativo_min == null || Number(poder_germinativo) >= Number(ts.poder_germinativo_min)) &&
    (ts.poder_germinativo_max == null || Number(poder_germinativo) <= Number(ts.poder_germinativo_max)) &&
    (ts.nivel_pureza_min == null || Number(nivel_de_pureza) >= Number(ts.nivel_pureza_min)) &&
    (ts.nivel_pureza_max == null || Number(nivel_de_pureza) <= Number(ts.nivel_pureza_max));

  // Paso 3.a: fuera de rango y el usuario todavia no confirmo -> se le pide confirmar,
  // no se persiste nada todavia (misma logica que GUI-07 variante "fuera de rango").
  if (!dentroDeRango && !confirmar_no_apto) {
    return res.status(409).json({
      error: 'Parametros fuera de rango',
      fuera_de_rango: true,
      rangos: {
        humedad: [ts.humedad_min, ts.humedad_max],
        poder_germinativo: [ts.poder_germinativo_min, ts.poder_germinativo_max],
        nivel_de_pureza: [ts.nivel_pureza_min, ts.nivel_pureza_max],
      },
    });
  }

  const resultado = dentroDeRango ? ResultadoControl.APTO : ResultadoControl.NO_APTO;

  const control = em.create(ControlDeCalidad, {
    tipo_control,
    resultado,
    humedad, poder_germinativo, nivel_de_pureza,
    descripcion,
    lote,
  });
  em.persist(control);

  // Paso 4 / 3.a.1.b.1: actualiza el estado del lote segun el resultado
  if (resultado === ResultadoControl.NO_APTO) {
    await cambiarEstado(em, { lote }, 'No apto');
  } else if (tipo_control === TipoControl.INICIAL) {
    await cambiarEstado(em, { lote }, 'En limpieza');
  }
  // Nota: el paso a "Para curar" ocurre en CUU03 (limpieza_clasificacion_controller),
  // no aca, incluso cuando el control intermedio da Apto.

  await em.flush();
  res.status(201).json(control);
}
