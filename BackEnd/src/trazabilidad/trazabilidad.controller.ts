import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Lote } from '../lote/lote.entity.js';
import { Partida } from '../partida/partida.entity.js';
import { Pedido } from '../pedido/pedido.entity.js';
import { PedidoDetalle } from '../pedido_detalle/pedido_detalle.entity.js';
import { ControlDeCalidad } from '../control_calidad/control_calidad.entity.js';
import { LimpiezaClasificacion } from '../limpieza_clasificacion/limpieza_clasificacion.entity.js';
import { Estado } from '../estado/estado.entity.js';

/**
 * Trazabilidad (Vision: "trazabilidad total ante reclamos"): permite ir del
 * lote de origen a los clientes que recibieron esa semilla y al reves.
 * Solo lectura.
 */

type EM = ReturnType<typeof getEM>;

async function estadoActualDe(em: EM, filtro: { lote?: number; partida?: number }): Promise<string | null> {
  const where: any = { fecha_hasta: null, deleted_at: null };
  if (filtro.lote != null) where.lote = { id_lote: filtro.lote };
  if (filtro.partida != null) where.partida = { id_partida: filtro.partida };
  const abierto = await em.findOne(Estado, where);
  if (abierto) return abierto.nombre;
  const ultimo = await em.find(Estado, { ...where, fecha_hasta: undefined }, { orderBy: { fecha_desde: 'DESC' }, limit: 1 });
  return ultimo[0]?.nombre ?? null;
}

function resumenControl(c: ControlDeCalidad) {
  return {
    id_control: c.id_control,
    fecha: c.fecha,
    tipo_control: c.tipo_control,
    resultado: c.resultado,
    humedad: Number(c.humedad),
    poder_germinativo: Number(c.poder_germinativo),
    nivel_de_pureza: Number(c.nivel_de_pureza),
    descripcion: c.descripcion ?? null,
  };
}

/** Clientes (pedidos) que consumen una partida. */
async function clientesDePartida(em: EM, idPartida: number) {
  const detalles = await em.find(
    PedidoDetalle,
    { partida_asignada: { id_partida: idPartida }, deleted_at: null },
    { populate: ['pedido'] },
  );
  return detalles
    .filter((d) => !d.pedido.deleted_at && d.pedido.estado_pedido !== 'Cancelado')
    .map((d) => ({
      id_pedido: d.pedido.id_pedido,
      nro_pedido: d.pedido.nro_pedido,
      comprador: d.pedido.comprador,
      estado_pedido: d.pedido.estado_pedido,
      fecha_pedido: d.pedido.fecha_pedido,
      bolsas: d.cantidad_asignada_bolsas ?? 0,
    }));
}

export async function buscar(req: Request, res: Response) {
  const em = getEM();
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.status(400).json({ error: 'Escribi al menos 2 caracteres para buscar' });
  const like = { $like: `%${q.replace(/[%_]/g, '')}%` };

  const lotes = await em.find(Lote, { nro_lote: like, deleted_at: null }, { populate: ['tipo_semilla'], limit: 20, orderBy: { fecha_ingreso: 'DESC' } });
  const partidas = await em.find(Partida, { nro_partida: like, deleted_at: null }, { populate: ['lote', 'lote.tipo_semilla'], limit: 20, orderBy: { id_partida: 'DESC' } });
  const pedidos = await em.find(Pedido, { comprador: like, deleted_at: null }, { orderBy: { fecha_pedido: 'DESC' } });

  const clientes = new Map<string, number>();
  for (const p of pedidos) clientes.set(p.comprador, (clientes.get(p.comprador) ?? 0) + 1);

  res.json({
    lotes: lotes.map((l) => ({
      id_lote: l.id_lote, nro_lote: l.nro_lote,
      semilla: l.tipo_semilla?.nombre_semilla, variedad: l.tipo_semilla?.variante_semilla,
    })),
    partidas: partidas.map((p) => ({
      id_partida: p.id_partida, nro_partida: p.nro_partida, nro_lote: p.lote?.nro_lote,
      semilla: p.lote?.tipo_semilla?.nombre_semilla, variedad: p.lote?.tipo_semilla?.variante_semilla,
    })),
    clientes: [...clientes.entries()].slice(0, 20).map(([comprador, pedidos]) => ({ comprador, pedidos })),
  });
}

/** Del lote hacia adelante: controles, limpiezas, partidas y a que clientes llego. */
export async function porLote(req: Request, res: Response) {
  const em = getEM();
  const lote = await em.findOne(
    Lote,
    { id_lote: Number(req.params.id), deleted_at: null },
    { populate: ['tipo_semilla', 'campo', 'proveedor', 'almacen'] },
  );
  if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

  const controles = await em.find(ControlDeCalidad, { lote: { id_lote: lote.id_lote }, deleted_at: null }, { orderBy: { fecha: 'ASC' } });
  const limpiezas = await em.find(LimpiezaClasificacion, { lote: { id_lote: lote.id_lote }, deleted_at: null }, { orderBy: { fecha: 'ASC' } });
  const estados = await em.find(Estado, { lote: { id_lote: lote.id_lote }, deleted_at: null }, { orderBy: { fecha_desde: 'ASC' }, populate: ['usuario'] });
  const partidas = await em.find(Partida, { lote: { id_lote: lote.id_lote }, deleted_at: null }, { orderBy: { id_partida: 'ASC' } });

  const partidasDto = [];
  for (const p of partidas) {
    const controlesFinal = await em.find(ControlDeCalidad, { partida: { id_partida: p.id_partida }, deleted_at: null }, { orderBy: { fecha: 'ASC' } });
    partidasDto.push({
      id_partida: p.id_partida,
      nro_partida: p.nro_partida,
      volumen_en_tn: Number(p.volumen_en_tn),
      cantidad_bolsas_20kg: p.cantidad_bolsas_20kg ?? 0,
      fecha_envasado: p.fecha_envasado ?? null,
      estado_actual: await estadoActualDe(em, { partida: p.id_partida }),
      controles: controlesFinal.map(resumenControl),
      clientes: await clientesDePartida(em, p.id_partida),
    });
  }

  res.json({
    lote: {
      id_lote: lote.id_lote, nro_lote: lote.nro_lote, origen_semilla: lote.origen_semilla,
      semilla: lote.tipo_semilla?.nombre_semilla, variedad: lote.tipo_semilla?.variante_semilla,
      campo: lote.campo?.nro_campo ?? null, proveedor: lote.proveedor?.razon_social ?? null,
      cantidad_actual_tn: Number(lote.cantidad_semillas_en_tn), fecha_ingreso: lote.fecha_ingreso,
      almacen: lote.almacen ? { id_almacen: lote.almacen.id_almacen, tipo: lote.almacen.tipo } : null,
      estado_actual: await estadoActualDe(em, { lote: lote.id_lote }),
    },
    estados: estados.map((e) => ({ nombre: e.nombre, desde: e.fecha_desde, hasta: e.fecha_hasta ?? null, usuario: e.usuario?.nombre_usuario ?? null })),
    controles: controles.map(resumenControl),
    limpiezas: limpiezas.map((l) => ({ fecha: l.fecha, volumen_restante_tn: Number(l.volumen_restante_tn), merma_tn: Number(l.merma_tn), observaciones: l.observaciones ?? null })),
    partidas: partidasDto,
  });
}

/** De la partida hacia atras (lote de origen) y hacia adelante (clientes). Ante un reclamo. */
export async function porPartida(req: Request, res: Response) {
  const em = getEM();
  const partida = await em.findOne(
    Partida,
    { id_partida: Number(req.params.id), deleted_at: null },
    { populate: ['lote', 'lote.tipo_semilla', 'lote.campo', 'lote.proveedor'] },
  );
  if (!partida) return res.status(404).json({ error: 'Partida no encontrada' });
  const lote = partida.lote;

  const controlesPartida = await em.find(ControlDeCalidad, { partida: { id_partida: partida.id_partida }, deleted_at: null }, { orderBy: { fecha: 'ASC' } });
  const controlesLote = await em.find(ControlDeCalidad, { lote: { id_lote: lote.id_lote }, deleted_at: null }, { orderBy: { fecha: 'ASC' } });
  const limpiezas = await em.find(LimpiezaClasificacion, { lote: { id_lote: lote.id_lote }, deleted_at: null }, { orderBy: { fecha: 'ASC' } });

  res.json({
    partida: {
      id_partida: partida.id_partida, nro_partida: partida.nro_partida,
      volumen_en_tn: Number(partida.volumen_en_tn), cantidad_bolsas_20kg: partida.cantidad_bolsas_20kg ?? 0,
      fecha_curado: partida.fecha_curado ?? null, fecha_envasado: partida.fecha_envasado ?? null,
      estado_actual: await estadoActualDe(em, { partida: partida.id_partida }),
    },
    lote_origen: {
      id_lote: lote.id_lote, nro_lote: lote.nro_lote, origen_semilla: lote.origen_semilla,
      semilla: lote.tipo_semilla?.nombre_semilla, variedad: lote.tipo_semilla?.variante_semilla,
      campo: lote.campo?.nro_campo ?? null, proveedor: lote.proveedor?.razon_social ?? null,
      fecha_ingreso: lote.fecha_ingreso,
    },
    controles_lote: controlesLote.map(resumenControl),
    limpiezas: limpiezas.map((l) => ({ fecha: l.fecha, volumen_restante_tn: Number(l.volumen_restante_tn), merma_tn: Number(l.merma_tn) })),
    controles_partida: controlesPartida.map(resumenControl),
    clientes: await clientesDePartida(em, partida.id_partida),
  });
}

/** De un cliente hacia atras: que partidas y de que lotes recibio. */
export async function porCliente(req: Request, res: Response) {
  const em = getEM();
  const nombre = String(req.query.nombre ?? '').trim();
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

  const pedidos = await em.find(Pedido, { comprador: nombre, deleted_at: null }, { orderBy: { fecha_pedido: 'DESC' } });
  const dto = [];
  for (const pedido of pedidos) {
    const detalles = await em.find(
      PedidoDetalle,
      { pedido: { id_pedido: pedido.id_pedido }, deleted_at: null },
      { populate: ['tipo_semilla', 'partida_asignada', 'partida_asignada.lote'] },
    );
    dto.push({
      id_pedido: pedido.id_pedido, nro_pedido: pedido.nro_pedido, fecha_pedido: pedido.fecha_pedido,
      estado_pedido: pedido.estado_pedido,
      items: detalles.map((d) => ({
        semilla: d.tipo_semilla.nombre_semilla, variedad: d.tipo_semilla.variante_semilla,
        bolsas: d.cantidad_asignada_bolsas ?? 0,
        partida: d.partida_asignada ? { id_partida: d.partida_asignada.id_partida, nro_partida: d.partida_asignada.nro_partida } : null,
        lote: d.partida_asignada?.lote ? { id_lote: d.partida_asignada.lote.id_lote, nro_lote: d.partida_asignada.lote.nro_lote } : null,
      })),
    });
  }
  res.json({ comprador: nombre, pedidos: dto });
}
