import type { Request, Response } from 'express';
import { getEM } from '../shared/db/orm.js';
import { Pedido, EstadoPedido, TipoPedido } from './pedido.entity.js';
import { PedidoDetalle } from '../pedido_detalle/pedido_detalle.entity.js';
import { TipoDeSemilla } from '../tipo_semilla/tipo_semilla.entity.js';
import { Partida } from '../partida/partida.entity.js';
import { Estado } from '../estado/estado.entity.js';

const KG_POR_BOLSA = 20;

export async function listarPedidos(req: Request, res: Response) {
  const em = getEM();
  const pedidos = await em.find(Pedido, { deleted_at: null }, { orderBy: { fecha_pedido: 'DESC' } });
  res.json(pedidos);
}

export async function obtenerPedido(req: Request, res: Response) {
  const em = getEM();
  const pedido = await em.findOne(Pedido, { id_pedido: Number(req.params.id), deleted_at: null });
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

  const detalle = await em.find(
    PedidoDetalle,
    { pedido: { id_pedido: pedido.id_pedido }, deleted_at: null },
    { populate: ['tipo_semilla', 'partida_asignada'] },
  );
  res.json({ pedido, detalle });
}

/**
 * Devuelve el stock disponible (en kg) de Partidas "Apto para comercializacion"
 * para una variedad de semilla dada, ordenadas por mas antiguas primero (FIFO),
 * descontando lo que ya esta comprometido en otros PedidoDetalle.
 */
async function stockDisponiblePorVariedad(em: any, tipoSemillaId: number) {
  const partidas: Partida[] = await em.find(
    Partida,
    { lote: { tipo_semilla: tipoSemillaId }, deleted_at: null },
    { populate: ['lote'], orderBy: { fecha_envasado: 'ASC' } },
  );

  const aptas: { partida: Partida; bolsasDisponibles: number }[] = [];
  for (const partida of partidas) {
    const estado = await em.findOne(Estado, { partida: partida.id_partida, fecha_hasta: null, deleted_at: null });
    if (estado?.nombre !== 'Apto para comercializacion') continue;

    const comprometidas = await em.find(PedidoDetalle, { partida_asignada: { id_partida: partida.id_partida }, deleted_at: null });
    const bolsasComprometidas = comprometidas.reduce((acc: number, d: PedidoDetalle) => acc + (d.cantidad_asignada_bolsas ?? 0), 0);
    const bolsasDisponibles = (partida.cantidad_bolsas_20kg ?? 0) - bolsasComprometidas;
    if (bolsasDisponibles > 0) aptas.push({ partida, bolsasDisponibles });
  }
  return aptas;
}

/**
 * CUU07 - "Gestionar pedido"
 * Paso 1-3: valida stock en Partidas aptas por variedad.
 * Alternativo 3.a: si no hay partidas aptas suficientes -> "Pendiente de stock"
 * (no se modela aqui el chequeo de Lotes en "Para curar" como stock alternativo,
 * ya que CUU07 solo exige avisar y dejar pendiente; la generacion de la orden de
 * curado queda para cuando el Operario de Planta use CUU05 manualmente).
 */
export async function gestionarPedido(req: Request, res: Response) {
  const em = getEM();
  const { comprador, fecha_requerida, tipo, items } = req.body;
  // items: [{ tipo_semilla_id, cantidad_solicitada_kg }]

  if (!comprador || !fecha_requerida || !tipo || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'comprador, fecha_requerida, tipo e items son requeridos' });
  }
  if (!Object.values(TipoPedido).includes(tipo)) {
    return res.status(400).json({ error: `tipo debe ser uno de: ${Object.values(TipoPedido).join(', ')}` });
  }

  const nroPedido = `PED-${Date.now()}`;
  let algunItemPendiente = false;
  const detalleAResolver: { item: any; tipoSemilla: TipoDeSemilla; asignaciones: { partida: Partida; bolsas: number }[] }[] = [];

  // Paso 2: verifica stock por cada item solicitado ANTES de persistir nada
  for (const item of items) {
    const tipoSemilla = await em.findOne(TipoDeSemilla, { id_semilla: item.tipo_semilla_id, deleted_at: null });
    if (!tipoSemilla) return res.status(404).json({ error: `TipoDeSemilla ${item.tipo_semilla_id} no encontrado` });

    const bolsasSolicitadas = Math.ceil(Number(item.cantidad_solicitada_kg) / KG_POR_BOLSA);
    const disponibles = await stockDisponiblePorVariedad(em, tipoSemilla.id_semilla);

    let bolsasRestantesPorAsignar = bolsasSolicitadas;
    const asignaciones: { partida: Partida; bolsas: number }[] = [];

    for (const { partida, bolsasDisponibles } of disponibles) {
      if (bolsasRestantesPorAsignar <= 0) break;
      const tomar = Math.min(bolsasDisponibles, bolsasRestantesPorAsignar);
      asignaciones.push({ partida, bolsas: tomar });
      bolsasRestantesPorAsignar -= tomar;
    }

    if (bolsasRestantesPorAsignar > 0) algunItemPendiente = true; // 3.a: falta stock para este item
    detalleAResolver.push({ item, tipoSemilla, asignaciones });
  }

  // Paso 5 / 3.a.4: registra el pedido en el estado que corresponda
  const pedido = em.create(Pedido, {
    nro_pedido: nroPedido,
    fecha_pedido: new Date(),
    fecha_requerida,
    comprador,
    tipo,
    estado_pedido: algunItemPendiente ? EstadoPedido.PENDIENTE_DE_STOCK : EstadoPedido.APROBADO_PARA_DESPACHO,
  });
  em.persist(pedido);

  for (const { item, tipoSemilla, asignaciones } of detalleAResolver) {
    if (asignaciones.length === 0) {
      // Sin ninguna partida disponible: el detalle queda sin partida asignada
      em.persist(em.create(PedidoDetalle, {
        pedido,
        tipo_semilla: tipoSemilla,
        cantidad_solicitada_kg: item.cantidad_solicitada_kg,
      }));
      continue;
    }
    for (const asignacion of asignaciones) {
      em.persist(em.create(PedidoDetalle, {
        pedido,
        tipo_semilla: tipoSemilla,
        cantidad_solicitada_kg: item.cantidad_solicitada_kg,
        partida_asignada: asignacion.partida,
        cantidad_asignada_bolsas: asignacion.bolsas,
      }));
    }
  }

  await em.flush();
  res.status(201).json({
    pedido,
    stock_pendiente: algunItemPendiente,
  });
}
