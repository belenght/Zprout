import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Lote, OrigenSemilla } from './lote.entity.js';
import { Campo } from '../campo/campo.entity.js';
import { Proveedor } from '../proveedor/proveedor.entity.js';
import { TipoDeSemilla } from '../tipo_semilla/tipo_semilla.entity.js';
import { ControlDeCalidad, TipoControl, ResultadoControl } from '../control_calidad/control_calidad.entity.js';
import { cambiarEstado } from '../estado/estado_helper.js';
import { ESTADOS_LOTE } from '../estado/estado_nombres.js';

export async function listarLotes(req: Request, res: Response) {
  const em = getEM();
  const lotes = await em.find(
    Lote,
    { deleted_at: null },
    { populate: ['tipo_semilla', 'campo', 'proveedor', 'almacen'], orderBy: { fecha_ingreso: 'DESC' } },
  );
  res.json(lotes);
}

export async function obtenerLote(req: Request, res: Response) {
  const em = getEM();
  const lote = await em.findOne(
    Lote,
    { id_lote: Number(req.params.id), deleted_at: null },
    { populate: ['tipo_semilla', 'campo', 'proveedor', 'almacen', 'campana'] },
  );
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
  res.json(lote);
}

/**
 * CUU01 - "Registrar Ingreso de lote de Semillas"
 * Camino basico: origen propio -> estado inicial "Pendiente CC"
 * Alternativo 4.a: origen externo -> CC inicial se da por aprobado automaticamente
 * y el lote saltea limpieza y curado (queda directo en flujo de CC final).
 */
export async function registrarIngresoLote(req: Request, res: Response) {
  const em = getEM();
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
    cantidad_semillas_en_tn,
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
    await cambiarEstado(em, { lote }, 'Pendiente CC' satisfies typeof ESTADOS_LOTE[number]);
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
    await cambiarEstado(em, { lote }, 'Para curar' satisfies typeof ESTADOS_LOTE[number]);
  }

  await em.flush();
  res.status(201).json(lote);
}
