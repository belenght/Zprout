import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Partida, TipoCurado } from './partida.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { Insumo } from '../insumo/insumo.entity.js';
import { PartidaInsumo } from '../partida_insumo/partida_insumo.entity.js';
import { ControlDeCalidad, TipoControl, ResultadoControl } from '../control_calidad/control_calidad.entity.js';
import { Estado } from '../estado/estado.entity.js';
import { cambiarEstado } from '../estado/estado_helper.js';

const KG_POR_BOLSA = 20;

export async function listarPartidas(req: Request, res: Response) {
  const em = getEM();
  const partidas = await em.find(
    Partida,
    { deleted_at: null },
    { populate: ['lote'], orderBy: { created_at: 'DESC' } },
  );
  res.json(partidas);
}

export async function obtenerPartida(req: Request, res: Response) {
  const em = getEM();
  const partida = await em.findOne(
    Partida,
    { id_partida: Number(req.params.id), deleted_at: null },
    { populate: ['lote'] },
  );
  if (!partida) return res.status(404).json({ error: 'Partida no encontrada' });
  res.json(partida);
}

/**
 * CUU05 - "Registrar curado y envasado"
 * Precondicion: el lote debe estar en estado "Para curar".
 * Paso 3: volumen a curar + tipo de curado + insumos con cantidad.
 * Paso 4: valida stock disponible del lote.
 * Paso 5-6: genera la Partida, calcula bolsas, la deja en estado "Envasado".
 */
export async function registrarCurado(req: Request, res: Response) {
  const em = getEM();
  const {
    lote_id,
    volumen_a_curar_tn,
    tipo_curado,     // 'fungicida' | 'insecticida' | 'mixto'
    insumos,         // [{ insumo_id, cantidad }]
  } = req.body;

  if (!lote_id || volumen_a_curar_tn == null || !tipo_curado) {
    return res.status(400).json({ error: 'lote_id, volumen_a_curar_tn y tipo_curado son requeridos' });
  }
  if (!Object.values(TipoCurado).includes(tipo_curado)) {
    return res.status(400).json({ error: `tipo_curado debe ser uno de: ${Object.values(TipoCurado).join(', ')}` });
  }

  const lote = await em.findOne(Lote, { id_lote: lote_id, deleted_at: null });
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  const estadoActual = await em.findOne(Estado, { lote: { id_lote: lote.id_lote }, fecha_hasta: null, deleted_at: null });
  if (!estadoActual || estadoActual.nombre !== 'Para curar') {
    return res.status(409).json({
      error: `El lote no esta en condiciones de ser curado (estado actual: ${estadoActual?.nombre ?? 'sin estado'})`,
    });
  }

  // Alternativo 4.a: stock disponible = volumen del lote menos lo ya fraccionado en partidas previas
  const partidasPrevias = await em.find(Partida, { lote: { id_lote: lote.id_lote }, deleted_at: null });
  const yaCurado = partidasPrevias.reduce((acc, p) => acc + Number(p.volumen_en_tn), 0);
  const disponible = Number(lote.cantidad_semillas_en_tn) - yaCurado;

  if (Number(volumen_a_curar_tn) > disponible) {
    return res.status(400).json({
      error: `Volumen a curar (${volumen_a_curar_tn} tn) supera el stock disponible del lote (${disponible} tn)`,
    });
  }

  // Paso 5-6: genera la Partida
  const nroPartida = `P-${lote.nro_lote}-${Date.now().toString().slice(-5)}`;
  const cantidadBolsas = Math.floor((Number(volumen_a_curar_tn) * 1000) / KG_POR_BOLSA);

  const partida = em.create(Partida, {
    nro_partida: nroPartida,
    volumen_en_tn: volumen_a_curar_tn,
    tipo_curado,
    fecha_curado: new Date(),
    cantidad_bolsas_20kg: cantidadBolsas,
    lote,
  });
  em.persist(partida);

  // Insumos utilizados (PartidaInsumo, N:M con Cantidad)
  if (Array.isArray(insumos)) {
    for (const item of insumos) {
      const insumo = await em.findOne(Insumo, { id_insumo: item.insumo_id, deleted_at: null });
      if (!insumo) return res.status(404).json({ error: `Insumo ${item.insumo_id} no encontrado` });

      const partidaInsumo = em.create(PartidaInsumo, {
        partida,
        insumo,
        cantidad: item.cantidad,
      });
      em.persist(partidaInsumo);
    }
  }

  // Estado inicial de la Partida: "Envasado"
  await cambiarEstado(em, { partida }, 'Envasado');

  await em.flush();
  res.status(201).json(partida);
}

/**
 * CUU06 - "Registrar Control de Calidad de Lote" (en rigor: control final sobre
 * la Partida ya envasada, y generacion del Informe de Partida).
 * Precondicion: la partida debe estar en estado "Envasado".
 * Alternativo 3.b: fuera de rango + usuario confirma -> Partida "Rechazado", sin informe.
 */
export async function registrarControlFinalYGenerarInforme(req: Request, res: Response) {
  const em = getEM();
  const {
    partida_id,
    humedad,
    poder_germinativo,
    nivel_de_pureza,
    cantidad_bolsas_20kg, // confirmacion/ajuste del conteo real (paso 6)
    fecha_envasado,
    confirmar_no_apto,     // true si el usuario confirma el rechazo pese al valor fuera de rango (3.b)
  } = req.body;

  if (!partida_id || humedad == null || poder_germinativo == null || nivel_de_pureza == null) {
    return res.status(400).json({ error: 'partida_id, humedad, poder_germinativo y nivel_de_pureza son requeridos' });
  }

  const partida = await em.findOne(
    Partida,
    { id_partida: partida_id, deleted_at: null },
    { populate: ['lote', 'lote.tipo_semilla'] },
  );
  if (!partida) return res.status(404).json({ error: 'Partida no encontrada' });

  const estadoActual = await em.findOne(Estado, { partida: { id_partida: partida.id_partida }, fecha_hasta: null, deleted_at: null });
  if (!estadoActual || estadoActual.nombre !== 'Envasado') {
    return res.status(409).json({
      error: `La partida no esta en condiciones de control final (estado actual: ${estadoActual?.nombre ?? 'sin estado'})`,
    });
  }

  const ts = partida.lote.tipo_semilla;
  const dentroDeRango =
    (ts.humedad_min == null || Number(humedad) >= Number(ts.humedad_min)) &&
    (ts.humedad_max == null || Number(humedad) <= Number(ts.humedad_max)) &&
    (ts.poder_germinativo_min == null || Number(poder_germinativo) >= Number(ts.poder_germinativo_min)) &&
    (ts.poder_germinativo_max == null || Number(poder_germinativo) <= Number(ts.poder_germinativo_max)) &&
    (ts.nivel_pureza_min == null || Number(nivel_de_pureza) >= Number(ts.nivel_pureza_min)) &&
    (ts.nivel_pureza_max == null || Number(nivel_de_pureza) <= Number(ts.nivel_pureza_max));

  if (!dentroDeRango && !confirmar_no_apto) {
    return res.status(409).json({
      error: 'Parametros fuera de rango en el control final',
      fuera_de_rango: true,
      rangos: {
        humedad: [ts.humedad_min, ts.humedad_max],
        poder_germinativo: [ts.poder_germinativo_min, ts.poder_germinativo_max],
        nivel_de_pureza: [ts.nivel_pureza_min, ts.nivel_pureza_max],
      },
    });
  }

  const control = em.create(ControlDeCalidad, {
    tipo_control: TipoControl.FINAL,
    resultado: dentroDeRango ? ResultadoControl.APTO : ResultadoControl.NO_APTO,
    humedad, poder_germinativo, nivel_de_pureza,
    partida,
  });
  em.persist(control);

  if (!dentroDeRango) {
    // 3.b.3: Partida "Rechazado", sin informe de partida
    await cambiarEstado(em, { partida }, 'Rechazado');
    await em.flush();
    return res.status(200).json({ partida, control, informe_generado: false });
  }

  // Paso 6-7: confirma bolsas, fecha de envasado y genera el Informe de Partida
  partida.cantidad_bolsas_20kg = cantidad_bolsas_20kg ?? partida.cantidad_bolsas_20kg;
  partida.fecha_envasado = fecha_envasado ? new Date(fecha_envasado) : new Date();

  await cambiarEstado(em, { partida }, 'Apto para comercializacion');
  await em.flush();

  const informeDePartida = {
    nro_partida: partida.nro_partida,
    nro_lote_origen: partida.lote.nro_lote,
    fecha_envasado: partida.fecha_envasado,
    cantidad_bolsas_20kg: partida.cantidad_bolsas_20kg,
    resultados_calidad: { humedad, poder_germinativo, nivel_de_pureza },
    estado: 'Apto para comercializacion',
  };

  res.status(200).json({ partida, control, informe_generado: true, informe_de_partida: informeDePartida });
}
