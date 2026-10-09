import type { Request, Response } from 'express';
import { wrap } from '@mikro-orm/core';
import { getEM } from '../shared/db/orm.js';
import { Lote, OrigenSemilla } from './lote.entity.js';
import { Campo } from '../campo/campo.entity.js';
import { Almacen } from '../almacen/almacen.entity.js';
import { Proveedor } from '../proveedor/proveedor.entity.js';
import { TipoDeSemilla } from '../tipo_semilla/tipo_semilla.entity.js';
import { ControlDeCalidad, TipoControl, ResultadoControl } from '../control_calidad/control_calidad.entity.js';
import { Estado } from '../estado/estado.entity.js';
import { cambiarEstado } from '../estado/estado_helper.js';
import { ESTADOS_LOTE } from '../estado/estado_nombres.js';
import { Usuario } from '../usuario/usuario.entity.js';
import { LimpiezaClasificacion } from '../limpieza_clasificacion/limpieza_clasificacion.entity.js';
import { DIAS_MAX_PARA_CURAR } from './reglas.js';
import { registrarBitacora } from '../bitacora/bitacora.helper.js';

const CANTIDAD_MIN_TN = 0.01;
const OBSERVACIONES_MAX = 500;
const INFORME_CALIDAD_MAX = 255;

/**
 * El front (listado y detalle de lote) necesita el estado vigente de cada
 * lote, pero Estado vive en su propia tabla (historial). Se resuelve aca en
 * bloque para no pegarle una consulta N+1 al armar el listado.
 */
async function conEstadoActual(em: ReturnType<typeof getEM>, lotes: Lote[]) {
  if (lotes.length === 0) return [];
  const ids = lotes.map((l) => l.id_lote);
  const abiertos = await em.find(Estado, { lote: { id_lote: { $in: ids } }, fecha_hasta: null, deleted_at: null });
  const mapa = new Map(abiertos.map((e) => [e.lote?.id_lote, e.nombre]));

  // Busca lotes antiguos cuyo último evento quedó cerrado por
  // una transición anterior: el último estado conocido es más útil que
  // mostrar "Sin estado" y conserva la trazabilidad real del lote.
  const sinEstadoAbierto = ids.filter((id) => !mapa.has(id));
  if (sinEstadoAbierto.length > 0) {
    const historial = await em.find(
      Estado,
      { lote: { id_lote: { $in: sinEstadoAbierto } }, deleted_at: null },
      { orderBy: { fecha_desde: 'DESC' } },
    );
    for (const estado of historial) {
      const idLote = estado.lote?.id_lote;
      if (idLote != null && !mapa.has(idLote)) mapa.set(idLote, estado.nombre);
    }
  }

  // Datos para decidir el proximo paso del lote (una sola fuente de verdad para
  // el front: stepper, bandeja de calidad, curado y dashboard).
  const desdeEstado = new Map(abiertos.map((e) => [e.lote?.id_lote, new Date(e.fecha_desde).getTime()]));
  const conLimpieza = new Set(
    (await em.find(LimpiezaClasificacion, { lote: { id_lote: { $in: ids } }, deleted_at: null })).map((x) => x.lote.id_lote),
  );
  const intermedios = await em.find(
    ControlDeCalidad,
    { lote: { id_lote: { $in: ids } }, tipo_control: TipoControl.INTERMEDIO, deleted_at: null },
    { orderBy: { fecha: 'DESC' } },
  );
  const ultimoIntermedio = new Map<number, ControlDeCalidad>();
  for (const c of intermedios) if (!ultimoIntermedio.has(c.lote!.id_lote)) ultimoIntermedio.set(c.lote!.id_lote, c);

  return lotes.map((l) => {
    const estado = mapa.get(l.id_lote) ?? null;
    const limpio = conLimpieza.has(l.id_lote);
    const ult = ultimoIntermedio.get(l.id_lote);
    const ccInter = ult ? (ult.resultado === ResultadoControl.APTO ? 'apto' : 'no_apto') : null;
    let proximo: string | null = null;
    let puedeSegundoCC = false;
    if (estado === 'Pendiente CC') proximo = 'cc_inicial';
    else if (estado === 'En limpieza') proximo = 'limpieza';
    else if (estado === 'No apto') proximo = 'destino';
    else if (estado === 'Para curar') {
      proximo = limpio && ccInter !== 'apto' ? 'cc_intermedio' : 'curado';
      if (limpio && ult) {
        const desde = Math.max(new Date(ult.fecha).getTime(), desdeEstado.get(l.id_lote) ?? 0);
        puedeSegundoCC = Math.floor((Date.now() - desde) / 86_400_000) >= DIAS_MAX_PARA_CURAR;
      }
    }
    return {
      ...wrap(l).toJSON(),
      estado_actual: estado,
      tiene_limpieza: limpio,
      cc_intermedio: ccInter,
      proximo_paso: proximo,
      puede_segundo_cc: puedeSegundoCC,
      dias_max_para_curar: DIAS_MAX_PARA_CURAR,
    };
  });
}

export async function listarLotes(req: Request, res: Response) {
  const em = getEM();
  const lotes = await em.find(
    Lote,
    { deleted_at: null },
    { populate: ['tipo_semilla', 'campo', 'proveedor', 'almacen'], orderBy: { fecha_ingreso: 'DESC' } },
  );
  res.json(await conEstadoActual(em, lotes));
}

export async function obtenerLote(req: Request, res: Response) {
  const em = getEM();
  const lote = await em.findOne(
    Lote,
    { id_lote: Number(req.params.id), deleted_at: null },
    { populate: ['tipo_semilla', 'campo', 'proveedor', 'almacen', 'campana'] },
  );
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  const [dto] = await conEstadoActual(em, [lote]);
  res.json(dto);
}

/**
 * CUU01 - "Registrar Ingreso de lote de Semillas"
 * Camino basico: origen propio -> estado inicial "Pendiente CC"
 * Alternativo 4.a: origen externo -> CC inicial se da por aprobado automaticamente
 * y el lote saltea limpieza y curado (queda directo en flujo de CC final).
 */
export async function registrarIngresoLote(req: Request, res: Response) {
  const em = getEM();
  const usuarioId = req.usuario?.id_usuario;
  if (!usuarioId) return res.status(401).json({ error: 'Usuario autenticado no disponible' });
  const usuario = await em.findOne(Usuario, { id_usuario: usuarioId });
  if (!usuario) return res.status(401).json({ error: 'Usuario autenticado no disponible' });
  const {
    tipo_semilla_id,
    cantidad_semillas_en_tn,
    origen_semilla, // 'propio' | 'externo'
    campo_id,        // requerido si origen_semilla === 'propio'
    proveedor_id,    // requerido si origen_semilla === 'externo'
    informe_calidad_externo,
    observaciones,
  } = req.body;

  if (!tipo_semilla_id || !cantidad_semillas_en_tn || !origen_semilla) {
    return res.status(400).json({ error: 'tipo_semilla_id, cantidad_semillas_en_tn y origen_semilla son requeridos' });
  }
  // La version anterior no validaba que cantidad_semillas_en_tn fuera
  // realmente un numero positivo: un valor negativo o texto pasaba sin
  // problema porque solo se chequeaba truthy.
  const cantidadNum = Number(cantidad_semillas_en_tn);
  if (!Number.isFinite(cantidadNum) || cantidadNum < CANTIDAD_MIN_TN) {
    return res.status(400).json({ error: `cantidad_semillas_en_tn debe ser un numero mayor o igual a ${CANTIDAD_MIN_TN}` });
  }
  if (typeof observaciones === 'string' && observaciones.length > OBSERVACIONES_MAX) {
    return res.status(400).json({ error: `observaciones no puede superar los ${OBSERVACIONES_MAX} caracteres` });
  }
  if (typeof informe_calidad_externo === 'string' && informe_calidad_externo.length > INFORME_CALIDAD_MAX) {
    return res.status(400).json({ error: `informe_calidad_externo no puede superar los ${INFORME_CALIDAD_MAX} caracteres` });
  }
  if (!Object.values(OrigenSemilla).includes(origen_semilla)) {
    return res.status(400).json({ error: `origen_semilla debe ser uno de: ${Object.values(OrigenSemilla).join(', ')}` });
  }

  const tipoSemilla = await em.findOne(TipoDeSemilla, { id_semilla: tipo_semilla_id, deleted_at: null });
  if (!tipoSemilla) return res.status(404).json({ error: 'TipoDeSemilla no encontrado' });

  let campo: Campo | undefined;
  let proveedor: Proveedor | undefined;
  let descripcionOrigen: string | undefined;

  if (origen_semilla === OrigenSemilla.PROPIO) {
    // Camino basico (pasos 3-4)
    if (!campo_id) return res.status(400).json({ error: 'campo_id es requerido cuando origen_semilla es "propio"' });
    campo = await em.findOne(Campo, { id_campo: campo_id, deleted_at: null }) ?? undefined;
    if (!campo) return res.status(404).json({ error: 'Campo no encontrado' });
    descripcionOrigen = campo.nro_campo;
  } else {
    // Alternativo 4.a: origen externo
    if (!proveedor_id) return res.status(400).json({ error: 'proveedor_id es requerido cuando origen_semilla es "externo"' });
    proveedor = await em.findOne(Proveedor, { id_proveedor: proveedor_id, deleted_at: null }) ?? undefined;
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });
    descripcionOrigen = proveedor.razon_social;
  }

  // Paso 6: generacion de NroLote combinando campo/proveedor y fecha, para trazabilidad
  const fechaIngreso = new Date();
  const sufijoFecha = fechaIngreso.toISOString().slice(0, 10).replace(/-/g, '');
  const prefijo = campo ? campo.nro_campo : `EXT-${proveedor!.id_proveedor}`;
  const nroLote = `L-${prefijo}-${sufijoFecha}-${Date.now().toString().slice(-4)}`;

  const lote = em.create(Lote, {
    nro_lote: nroLote,
    origen_semilla,
    descripcion_origen: descripcionOrigen,
    cantidad_semillas_en_tn: String(cantidadNum),
    fecha_ingreso: fechaIngreso,
    observaciones,
    campo,
    proveedor,
    tipo_semilla: tipoSemilla,
    informe_calidad_externo: origen_semilla === OrigenSemilla.EXTERNO ? informe_calidad_externo : undefined,
  });
  em.persist(lote);

  if (origen_semilla === OrigenSemilla.PROPIO) {
    // Paso 7-8: queda pendiente de CC inicial
    await cambiarEstado(em, { lote }, 'Pendiente CC' satisfies typeof ESTADOS_LOTE[number], usuario);
  } else {
    // 4.a.2 - 4.a.4: CC inicial se considera superado automaticamente
    const ccAutomatico = em.create(ControlDeCalidad, {
      tipo_control: TipoControl.INICIAL,
      resultado: ResultadoControl.APTO,
      humedad: '0',
      poder_germinativo: '0',
      nivel_de_pureza: '0',
      descripcion: 'CC inicial superado automaticamente por origen externo (informe de proveedor adjunto).',
      lote,
    });
    em.persist(ccAutomatico);
    // 4.a.3: saltea clasificacion y curado -> directo a la cola de CC final,
    // se modela reutilizando "Para curar" como bandera de "listo para el siguiente paso"
    // ya que el vocabulario oficial de Lote no define un estado propio para este caso.
    await cambiarEstado(em, { lote }, 'Para curar' satisfies typeof ESTADOS_LOTE[number], usuario);
  }

  await em.flush();
  res.status(201).json(lote);
}

/**
 * Asigna/reasigna el almacen fisico donde esta guardado el lote (silo o
 * galpon, ver GUI-15). No forma parte de ningun CUU original: se agrega
 * para que el modulo de Almacen tenga datos reales de ocupacion.
 */
export async function asignarAlmacenLote(req: Request, res: Response) {
  const em = getEM();
  const { almacen_id } = req.body;

  const lote = await em.findOne(Lote, { id_lote: Number(req.params.id), deleted_at: null });
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  if (almacen_id == null) {
    lote.almacen = undefined;
  } else {
    const almacen = await em.findOne(Almacen, { id_almacen: almacen_id, deleted_at: null });
    if (!almacen) return res.status(404).json({ error: 'Almacen no encontrado' });
    lote.almacen = almacen;
  }

  await em.flush();
  const [dto] = await conEstadoActual(em, [lote]);
  res.json(dto);
}


const DESTINOS_VALIDOS = ['Venta como grano', 'Descarte'] as const;

/**
 * Destino de un lote "No apto" (Minuta de relevamiento + Maquinas de Estado):
 * si no pasa el primer control, se analiza si puede venderse como grano; si no,
 * se descarta. Ambos son estados terminales. Solo se llega desde "No apto".
 * Al salir del circuito de semilla, el lote libera el lugar que ocupaba en el
 * almacen.
 */
export async function asignarDestinoLote(req: Request, res: Response) {
  const em = getEM();
  const { destino, motivo } = req.body ?? {};
  if (!DESTINOS_VALIDOS.includes(destino)) {
    return res.status(400).json({ error: `destino debe ser uno de: ${DESTINOS_VALIDOS.join(', ')}` });
  }
  if (motivo !== undefined && (typeof motivo !== 'string' || motivo.length > 255)) {
    return res.status(400).json({ error: 'motivo no puede superar los 255 caracteres' });
  }

  const lote = await em.findOne(Lote, { id_lote: Number(req.params.id), deleted_at: null });
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  const estadoActual = await em.findOne(Estado, { lote: { id_lote: lote.id_lote }, fecha_hasta: null, deleted_at: null });
  if (estadoActual?.nombre !== 'No apto') {
    return res.status(409).json({
      error: `Solo un lote "No apto" puede pasar a "${destino}" (estado actual: "${estadoActual?.nombre ?? 'sin estado'}")`,
    });
  }

  const usuario = await em.findOne(Usuario, { id_usuario: req.usuario!.id_usuario });
  if (!usuario) return res.status(401).json({ error: 'Usuario autenticado no disponible' });

  await cambiarEstado(em, { lote }, destino, usuario);
  lote.almacen = undefined;
  registrarBitacora(req, 'lote.destino', lote.nro_lote, `${destino}${motivo ? ` — ${motivo}` : ''}`);
  await em.flush();

  const [dto] = await conEstadoActual(em, [lote]);
  res.json(dto);
}
