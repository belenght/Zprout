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

/**
 * CUU07, camino principal paso 4: "Mercadería entregada a Logística".
 * Solo valido desde "Aprobado para despacho" (ver Maquinas_de_Estado.pdf,
 * clase Pedido).
 */
export async function despacharPedido(req: Request, res: Response) {
  const em = getEM();
  const pedido = await em.findOne(Pedido, { id_pedido: Number(req.params.id), deleted_at: null });
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

  if (pedido.estado_pedido !== EstadoPedido.APROBADO_PARA_DESPACHO) {
    return res.status(409).json({
      error: `Solo se puede despachar un pedido "Aprobado para despacho" (estado actual: "${pedido.estado_pedido}")`,
    });
  }

  pedido.estado_pedido = EstadoPedido.DESPACHADO;
  await em.flush();
  res.json(pedido);
}

/**
 * CUU07, alternativo 3.b: "el Area Comercial decide registrar la anulacion
 * del pedido debido a la falta de stock fisico disponible". Solo valido
 * desde "Pendiente de stock".
 */
export async function cancelarPedido(req: Request, res: Response) {
  const em = getEM();
  const pedido = await em.findOne(Pedido, { id_pedido: Number(req.params.id), deleted_at: null });
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

  if (pedido.estado_pedido !== EstadoPedido.PENDIENTE_DE_STOCK) {
    return res.status(409).json({
      error: `Solo se puede cancelar un pedido "Pendiente de stock" (estado actual: "${pedido.estado_pedido}")`,
    });
  }

  pedido.estado_pedido = EstadoPedido.CANCELADO;
  await em.flush();
  res.json(pedido);
}

/**
 * CUU07, alternativo 3.a + Maquinas_de_Estado.pdf: "CUU05 - Registrar curado
 * y envasado / CUU06 - Registrar CC de Lote (Se curan y habilitan bolsas)"
 * es la transicion que saca a un Pedido de "Pendiente de stock". No hay un
 * trigger automatico que reevalue pedidos pendientes cada vez que se genera
 * una Partida apta, asi que este endpoint es el que el Encargado Comercial
 * dispara a mano ("reintentar", cuando ya se curo mas stock) para volver a
 * correr la misma logica de asignacion FIFO de gestionarPedido sobre lo que
 * todavia falta cubrir de este pedido puntual.
 */
/**
 * Corre la asignacion FIFO sobre lo que todavia falta cubrir de un pedido
 * "Pendiente de stock". Devuelve true si el pedido sigue sin cubrirse del todo.
 * No hace flush: lo hace quien llama.
 */
export async function reasignarPedido(em: any, pedido: Pedido): Promise<boolean> {
  const detalleExistente = await em.find(
    PedidoDetalle,
    { pedido: { id_pedido: pedido.id_pedido }, deleted_at: null },
    { populate: ['tipo_semilla'] },
  );

  // Agrupa por TipoDeSemilla: cada item original del pedido pudo haber
  // quedado repartido en varias filas de PedidoDetalle (una por Partida que
  // alcanzo a cubrir parte del pedido, ver gestionarPedido).
  const porTipoSemilla = new Map<number, { tipoSemilla: TipoDeSemilla; cantidadSolicitadaKg: number; bolsasYaAsignadas: number }>();
  for (const d of detalleExistente as PedidoDetalle[]) {
    const key = d.tipo_semilla.id_semilla;
    const acc = porTipoSemilla.get(key) ?? {
      tipoSemilla: d.tipo_semilla,
      cantidadSolicitadaKg: Number(d.cantidad_solicitada_kg),
      bolsasYaAsignadas: 0,
    };
    acc.bolsasYaAsignadas += d.cantidad_asignada_bolsas ?? 0;
    porTipoSemilla.set(key, acc);
  }

  let siguenFaltando = false;

  for (const { tipoSemilla, cantidadSolicitadaKg, bolsasYaAsignadas } of porTipoSemilla.values()) {
    const bolsasSolicitadas = Math.ceil(cantidadSolicitadaKg / KG_POR_BOLSA);
    let bolsasRestantes = bolsasSolicitadas - bolsasYaAsignadas;
    if (bolsasRestantes <= 0) continue;

    const disponibles = await stockDisponiblePorVariedad(em, tipoSemilla.id_semilla);
    for (const { partida, bolsasDisponibles } of disponibles) {
      if (bolsasRestantes <= 0) break;
      const tomar = Math.min(bolsasDisponibles, bolsasRestantes);
      em.persist(em.create(PedidoDetalle, {
        pedido,
        tipo_semilla: tipoSemilla,
        cantidad_solicitada_kg: String(cantidadSolicitadaKg),
        partida_asignada: partida,
        cantidad_asignada_bolsas: tomar,
      }));
      bolsasRestantes -= tomar;
    }

    if (bolsasRestantes > 0) siguenFaltando = true;
  }

  if (!siguenFaltando) {
    pedido.estado_pedido = EstadoPedido.APROBADO_PARA_DESPACHO;
  }
  return siguenFaltando;
}

/**
 * Se llama cuando una Partida pasa a "Apto para comercializacion": reintenta,
 * del pedido mas antiguo al mas nuevo, todos los "Pendiente de stock".
 * Devuelve los numeros de pedido que quedaron aprobados.
 */
export async function reintentarPendientes(em: any): Promise<string[]> {
  const pendientes: Pedido[] = await em.find(
    Pedido,
    { estado_pedido: EstadoPedido.PENDIENTE_DE_STOCK, deleted_at: null },
    { orderBy: { fecha_pedido: 'ASC', id_pedido: 'ASC' } },
  );
  const aprobados: string[] = [];
  for (const pedido of pendientes) {
    const siguenFaltando = await reasignarPedido(em, pedido);
    // Flush por pedido: el stock que toma uno tiene que verse al evaluar el siguiente.
    await em.flush();
    if (!siguenFaltando) aprobados.push(pedido.nro_pedido);
  }
  return aprobados;
}

export async function reintentarAsignacion(req: Request, res: Response) {
  const em = getEM();
  const pedido = await em.findOne(Pedido, { id_pedido: Number(req.params.id), deleted_at: null });
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

  if (pedido.estado_pedido !== EstadoPedido.PENDIENTE_DE_STOCK) {
    return res.status(409).json({
      error: `Solo tiene sentido reintentar un pedido "Pendiente de stock" (estado actual: "${pedido.estado_pedido}")`,
    });
  }

  const siguenFaltando = await reasignarPedido(em, pedido);
  await em.flush();
  res.json({ pedido, stock_pendiente: siguenFaltando });
}

/**
 * Demanda de curado (CUU07, alternativo 3.a: "genera una alerta de demanda
 * para el galpon, lo cual habilita al Operario de Planta a curar esa cantidad").
 * Por variedad: cuantas bolsas faltan para cubrir los pedidos "Pendiente de
 * stock", y cuantas toneladas hay a granel esperando curado ("Para curar").
 */
export async function demandaCurado(_req: Request, res: Response) {
  const em = getEM();
  const pendientes: Pedido[] = await em.find(
    Pedido,
    { estado_pedido: EstadoPedido.PENDIENTE_DE_STOCK, deleted_at: null },
    { orderBy: { fecha_pedido: 'ASC', id_pedido: 'ASC' } },
  );

  const porVariedad = new Map<number, {
    tipo_semilla_id: number; semilla: string; variedad: string;
    bolsas_faltantes: number; pedidos: Set<string>; pedido_mas_antiguo: Date | null; fecha_requerida_mas_proxima: Date | null;
  }>();

  for (const pedido of pendientes) {
    const detalle: PedidoDetalle[] = await em.find(
      PedidoDetalle,
      { pedido: { id_pedido: pedido.id_pedido }, deleted_at: null },
      { populate: ['tipo_semilla'] },
    );
    const porTipo = new Map<number, { ts: TipoDeSemilla; kg: number; asignadas: number }>();
    for (const d of detalle) {
      const acc = porTipo.get(d.tipo_semilla.id_semilla) ?? { ts: d.tipo_semilla, kg: Number(d.cantidad_solicitada_kg), asignadas: 0 };
      acc.asignadas += d.cantidad_asignada_bolsas ?? 0;
      porTipo.set(d.tipo_semilla.id_semilla, acc);
    }
    for (const { ts, kg, asignadas } of porTipo.values()) {
      const faltan = Math.ceil(kg / KG_POR_BOLSA) - asignadas;
      if (faltan <= 0) continue;
      const fila = porVariedad.get(ts.id_semilla) ?? {
        tipo_semilla_id: ts.id_semilla, semilla: ts.nombre_semilla, variedad: ts.variante_semilla,
        bolsas_faltantes: 0, pedidos: new Set<string>(), pedido_mas_antiguo: null, fecha_requerida_mas_proxima: null,
      };
      fila.bolsas_faltantes += faltan;
      fila.pedidos.add(pedido.nro_pedido);
      if (!fila.pedido_mas_antiguo || pedido.fecha_pedido < fila.pedido_mas_antiguo) fila.pedido_mas_antiguo = pedido.fecha_pedido;
      if (!fila.fecha_requerida_mas_proxima || pedido.fecha_requerida < fila.fecha_requerida_mas_proxima) fila.fecha_requerida_mas_proxima = pedido.fecha_requerida;
      porVariedad.set(ts.id_semilla, fila);
    }
  }

  // Toneladas a granel esperando curado, por variedad.
  const paraCurar: Estado[] = await em.find(Estado, { nombre: 'Para curar', fecha_hasta: null, deleted_at: null }, { populate: ['lote', 'lote.tipo_semilla'] });
  const tnPorVariedad = new Map<number, number>();
  for (const e of paraCurar) {
    const lote = e.lote;
    if (!lote || lote.deleted_at) continue;
    const id = lote.tipo_semilla.id_semilla;
    // Disponible = volumen del lote menos lo ya fraccionado en partidas (igual que la pantalla de Curado).
    const partidas = await em.find(Partida, { lote: { id_lote: lote.id_lote }, deleted_at: null });
    const yaCurado = partidas.reduce((acc, p) => acc + Number(p.volumen_en_tn), 0);
    const disponible = Math.max(Number(lote.cantidad_semillas_en_tn) - yaCurado, 0);
    tnPorVariedad.set(id, (tnPorVariedad.get(id) ?? 0) + disponible);
  }

  const filas = [...porVariedad.values()].map((f) => ({
    tipo_semilla_id: f.tipo_semilla_id,
    semilla: f.semilla,
    variedad: f.variedad,
    bolsas_faltantes: f.bolsas_faltantes,
    kg_faltantes: f.bolsas_faltantes * KG_POR_BOLSA,
    tn_faltantes: (f.bolsas_faltantes * KG_POR_BOLSA) / 1000,
    pedidos: [...f.pedidos],
    pedido_mas_antiguo: f.pedido_mas_antiguo,
    fecha_requerida_mas_proxima: f.fecha_requerida_mas_proxima,
    tn_a_granel_para_curar: tnPorVariedad.get(f.tipo_semilla_id) ?? 0,
  }));
  filas.sort((a, b) => String(a.fecha_requerida_mas_proxima).localeCompare(String(b.fecha_requerida_mas_proxima)));
  res.json(filas);
}
