import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { ControlDeCalidad, TipoControl, ResultadoControl } from './control_calidad.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { cambiarEstado } from '../estado/estado_helper.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { Estado } from '../estado/estado.entity.js';
import { LimpiezaClasificacion } from '../limpieza_clasificacion/limpieza_clasificacion.entity.js';
import { DIAS_MAX_PARA_CURAR } from '../lote/reglas.js';

const DESCRIPCION_MAX = 500;

export async function listarControlesPorLote(req: Request, res: Response) {
  const em = getEM();
  const controles = await em.find(
    ControlDeCalidad,
    { lote: { id_lote: Number(req.params.loteId) }, deleted_at: null },
    { orderBy: { fecha: 'ASC' } },
  );
  res.json(controles);
}

export async function listarControles(req: Request, res: Response) {
  const em = getEM();
  const controles = await em.find(
    ControlDeCalidad,
    { deleted_at: null },
    { populate: ['lote', 'lote.tipo_semilla', 'partida'], orderBy: { fecha: 'DESC' } },
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
  const usuarioId = req.usuario?.id_usuario;
  if (!usuarioId) return res.status(401).json({ error: 'Usuario autenticado no disponible' });
  const usuario = await em.findOne(Usuario, { id_usuario: usuarioId });
  if (!usuario) return res.status(401).json({ error: 'Usuario autenticado no disponible' });
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
  // Antes humedad/poder_germinativo/nivel_de_pureza se usaban tal cual
  // venian del body, sin chequear que fueran numeros validos ni positivos.
  const humedadNum = Number(humedad);
  const pgNum = Number(poder_germinativo);
  const purezaNum = Number(nivel_de_pureza);
  if (
    !Number.isFinite(humedadNum) || humedadNum < 0 ||
    !Number.isFinite(pgNum) || pgNum < 0 ||
    !Number.isFinite(purezaNum) || purezaNum < 0
  ) {
    return res.status(400).json({ error: 'humedad, poder_germinativo y nivel_de_pureza deben ser numeros mayores o iguales a 0' });
  }
  if (typeof descripcion === 'string' && descripcion.length > DESCRIPCION_MAX) {
    return res.status(400).json({ error: `descripcion no puede superar los ${DESCRIPCION_MAX} caracteres` });
  }
  if (![TipoControl.INICIAL, TipoControl.INTERMEDIO].includes(tipo_control)) {
    return res.status(400).json({ error: 'tipo_control debe ser "inicial" o "intermedio" en este endpoint' });
  }

  const lote = await em.findOne(Lote, { id_lote: lote_id, deleted_at: null }, { populate: ['tipo_semilla'] });
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  // Orden del proceso (CUU02 precondicion: "lote disponible para ser inspeccionado
  // segun la etapa"; CUU03/CRE: limpieza -> control intermedio):
  //  - inicial: solo con el lote en "Pendiente CC".
  //  - intermedio: solo con el lote ya limpio ("Para curar" con limpieza registrada);
  //    un segundo intermedio solo despues del limite de dias (RN 13).
  const estadoActual = await em.findOne(Estado, { lote: { id_lote: lote.id_lote }, fecha_hasta: null, deleted_at: null });
  const nombreEstado = estadoActual?.nombre ?? 'sin estado';
  if (tipo_control === TipoControl.INICIAL && nombreEstado !== 'Pendiente CC') {
    return res.status(409).json({ error: `El control inicial solo se registra con el lote en "Pendiente CC" (estado actual: ${nombreEstado})` });
  }
  if (tipo_control === TipoControl.INTERMEDIO) {
    if (nombreEstado !== 'Para curar') {
      return res.status(409).json({
        error: nombreEstado === 'En limpieza'
          ? 'El control intermedio se registra despues de la limpieza: primero registra la limpieza y clasificacion del lote'
          : `El control intermedio solo se registra con el lote limpio, en "Para curar" (estado actual: ${nombreEstado})`,
      });
    }
    const limpiezas = await em.count(LimpiezaClasificacion, { lote: { id_lote: lote.id_lote }, deleted_at: null });
    if (limpiezas === 0) {
      return res.status(409).json({ error: 'Este lote no tuvo limpieza y clasificacion, por lo que no lleva control intermedio' });
    }
    const previos = await em.find(ControlDeCalidad, { lote: { id_lote: lote.id_lote }, tipo_control: TipoControl.INTERMEDIO, deleted_at: null }, { orderBy: { fecha: 'DESC' }, limit: 1 });
    if (previos.length > 0) {
      const desde = Math.max(new Date(previos[0].fecha).getTime(), new Date(estadoActual!.fecha_desde).getTime());
      const dias = Math.floor((Date.now() - desde) / 86_400_000);
      if (dias < DIAS_MAX_PARA_CURAR) {
        return res.status(409).json({ error: `El lote ya tiene control intermedio. Un segundo control se habilita despues de ${DIAS_MAX_PARA_CURAR} dias en "Para curar" (pasaron ${dias})` });
      }
    }
  }

  const ts = lote.tipo_semilla;
  const dentroDeRango =
    (ts.humedad_min == null || humedadNum >= Number(ts.humedad_min)) &&
    (ts.humedad_max == null || humedadNum <= Number(ts.humedad_max)) &&
    (ts.poder_germinativo_min == null || pgNum >= Number(ts.poder_germinativo_min)) &&
    (ts.poder_germinativo_max == null || pgNum <= Number(ts.poder_germinativo_max)) &&
    (ts.nivel_pureza_min == null || purezaNum >= Number(ts.nivel_pureza_min)) &&
    (ts.nivel_pureza_max == null || purezaNum <= Number(ts.nivel_pureza_max));

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
    humedad: String(humedadNum), poder_germinativo: String(pgNum), nivel_de_pureza: String(purezaNum),
    descripcion,
    lote,
  });
  em.persist(control);

  // Paso 4 / 3.a.1.b.1: actualiza el estado del lote segun el resultado
  if (resultado === ResultadoControl.NO_APTO) {
    await cambiarEstado(em, { lote }, 'No apto', usuario);
  } else if (tipo_control === TipoControl.INICIAL) {
    await cambiarEstado(em, { lote }, 'En limpieza', usuario);
  }
  // Nota: el paso a "Para curar" ocurre en CUU03 (limpieza_clasificacion_controller),
  // no aca, incluso cuando el control intermedio da Apto.

  await em.flush();
  res.status(201).json(control);
}
