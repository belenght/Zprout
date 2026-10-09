import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Estado } from '../estado/estado.entity.js';
import { Lote } from '../lote/lote.entity.js';
import { Partida } from '../partida/partida.entity.js';
import { Pedido, EstadoPedido } from '../pedido/pedido.entity.js';
import { Almacen } from '../almacen/almacen.entity.js';
import { ControlDeCalidad, TipoControl } from '../control_calidad/control_calidad.entity.js';
import { LimpiezaClasificacion } from '../limpieza_clasificacion/limpieza_clasificacion.entity.js';
import { DIAS_MAX_PARA_CURAR } from '../lote/reglas.js';

/**
 * Alertas operativas para el Dashboard (solo lectura). Umbrales fijos y
 * documentados aca para poder ajustarlos en un unico lugar.
 */
const DIAS_PENDIENTE_CC = 7; // lote esperando control de calidad inicial
const DIAS_PARTIDA_SIN_CC_FINAL = 7; // partida envasada sin control final
const DIAS_PEDIDO_PENDIENTE = 15; // pedido esperando stock
const OCUPACION_ALERTA = 0.85; // almacen al 85% o mas

type Alerta = {
  tipo: string;
  severidad: 'alta' | 'media' | 'baja';
  mensaje: string;
  ruta: string;
  id: number | null;
  dias?: number;
};

const dias = (desde: Date) => Math.floor((Date.now() - new Date(desde).getTime()) / 86_400_000);

export async function listarAlertas(_req: Request, res: Response) {
  const em = getEM();
  const alertas: Alerta[] = [];

  // Estados abiertos de lotes y partidas
  const abiertos = await em.find(
    Estado,
    { fecha_hasta: null, deleted_at: null },
    { populate: ['lote', 'partida'] },
  );

  for (const e of abiertos) {
    const d = dias(e.fecha_desde);
    if (e.lote && e.nombre === 'Pendiente CC' && d >= DIAS_PENDIENTE_CC) {
      alertas.push({
        tipo: 'lote_pendiente_cc',
        severidad: d >= DIAS_PENDIENTE_CC * 2 ? 'alta' : 'media',
        mensaje: `Lote ${e.lote.nro_lote} espera control de calidad hace ${d} dias`,
        ruta: `/lotes/${e.lote.id_lote}`,
        id: e.lote.id_lote,
        dias: d,
      });
    }
    if (e.lote && e.nombre === 'Para curar') {
      const intermedios = await em.find(
        ControlDeCalidad,
        { lote: { id_lote: e.lote.id_lote }, tipo_control: TipoControl.INTERMEDIO, deleted_at: null },
        { orderBy: { fecha: 'DESC' }, limit: 1 },
      );
      const limpio = await em.count(LimpiezaClasificacion, { lote: { id_lote: e.lote.id_lote }, deleted_at: null });
      if (limpio > 0 && intermedios.length === 0) {
        // Lote limpio al que le falta el control intermedio (habilita el curado).
        alertas.push({
          tipo: 'lote_pendiente_cc_intermedio',
          severidad: d >= DIAS_PENDIENTE_CC ? 'media' : 'baja',
          mensaje: `Lote ${e.lote.nro_lote} limpio: falta el control de calidad intermedio`,
          ruta: `/lotes/${e.lote.id_lote}`,
          id: e.lote.id_lote,
          dias: d,
        });
      } else {
        // RN 13: demasiado tiempo en "Para curar" -> pedir un segundo control antes de curar.
        const desde = Math.max(new Date(e.fecha_desde).getTime(), intermedios[0] ? new Date(intermedios[0].fecha).getTime() : 0);
        const dd = Math.floor((Date.now() - desde) / 86_400_000);
        if (dd >= DIAS_MAX_PARA_CURAR) {
          alertas.push({
            tipo: 'lote_requiere_segundo_control',
            severidad: 'media',
            mensaje: `Lote ${e.lote.nro_lote} lleva ${dd} dias en "Para curar": corresponde un segundo control de calidad antes de curar`,
            ruta: `/lotes/${e.lote.id_lote}`,
            id: e.lote.id_lote,
            dias: dd,
          });
        }
      }
    }
    if (e.lote && e.nombre === 'No apto') {
      alertas.push({
        tipo: 'lote_sin_destino',
        severidad: 'media',
        mensaje: `Lote ${e.lote.nro_lote} no apto: falta definir destino (venta como grano o descarte)`,
        ruta: `/lotes/${e.lote.id_lote}`,
        id: e.lote.id_lote,
        dias: d,
      });
    }
    if (e.partida && e.nombre === 'Envasado' && d >= DIAS_PARTIDA_SIN_CC_FINAL) {
      alertas.push({
        tipo: 'partida_sin_cc_final',
        severidad: 'media',
        mensaje: `Partida ${e.partida.nro_partida} envasada hace ${d} dias sin control final`,
        ruta: `/partidas/${e.partida.id_partida}`,
        id: e.partida.id_partida,
        dias: d,
      });
    }
  }

  // Pedidos pendientes de stock
  const pendientes = await em.find(Pedido, { estado_pedido: EstadoPedido.PENDIENTE_DE_STOCK, deleted_at: null });
  for (const p of pendientes) {
    const d = dias(p.fecha_pedido);
    const vencido = new Date(p.fecha_requerida).getTime() < Date.now();
    if (d >= DIAS_PEDIDO_PENDIENTE || vencido) {
      alertas.push({
        tipo: 'pedido_pendiente',
        severidad: vencido ? 'alta' : 'media',
        mensaje: vencido
          ? `Pedido ${p.nro_pedido} (${p.comprador}) vencio su fecha requerida y sigue sin stock`
          : `Pedido ${p.nro_pedido} (${p.comprador}) pendiente de stock hace ${d} dias`,
        ruta: '/pedidos',
        id: p.id_pedido,
        dias: d,
      });
    }
  }

  // Almacenes casi llenos
  const almacenes = await em.find(Almacen, { deleted_at: null });
  if (almacenes.length > 0) {
    const lotes = await em.find(Lote, {
      almacen: { id_almacen: { $in: almacenes.map((a) => a.id_almacen) } },
      deleted_at: null,
    }, { populate: ['almacen'] });
    const ocupado = new Map<number, number>();
    for (const l of lotes) {
      const id = l.almacen!.id_almacen;
      ocupado.set(id, (ocupado.get(id) ?? 0) + Number(l.cantidad_semillas_en_tn));
    }
    for (const a of almacenes) {
      const cap = Number(a.capacidad);
      const oc = ocupado.get(a.id_almacen) ?? 0;
      if (cap > 0 && oc / cap >= OCUPACION_ALERTA) {
        const pct = Math.round((oc / cap) * 100);
        alertas.push({
          tipo: 'almacen_lleno',
          severidad: pct >= 100 ? 'alta' : 'media',
          mensaje: `Almacen #${a.id_almacen} (${a.tipo}) al ${pct}% de su capacidad`,
          ruta: '/almacen',
          id: a.id_almacen,
        });
      }
    }
  }

  const orden = { alta: 0, media: 1, baja: 2 } as const;
  alertas.sort((x, y) => orden[x.severidad] - orden[y.severidad] || (y.dias ?? 0) - (x.dias ?? 0));
  res.json({ total: alertas.length, alertas });
}
