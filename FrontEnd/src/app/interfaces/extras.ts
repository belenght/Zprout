// Interfaces de las funciones nuevas: trazabilidad, alertas, bitacora y
// demanda de curado (espejo de los DTO del backend).
export interface Alerta {
  tipo: string;
  severidad: 'alta' | 'media' | 'baja';
  mensaje: string;
  ruta: string;
  id: number | null;
  dias?: number;
}
export interface RespuestaAlertas {
  total: number;
  alertas: Alerta[];
}

export interface RegistroBitacora {
  id_bitacora: number;
  fecha: string;
  id_usuario_actor: number | null;
  usuario_actor: string;
  accion: string;
  objetivo: string | null;
  detalle: string | null;
}

export interface DemandaCurado {
  tipo_semilla_id: number;
  semilla: string;
  variedad: string;
  bolsas_faltantes: number;
  kg_faltantes: number;
  tn_faltantes: number;
  pedidos: string[];
  pedido_mas_antiguo: string | null;
  fecha_requerida_mas_proxima: string | null;
  tn_a_granel_para_curar: number;
}

export interface ControlResumen {
  id_control: number;
  fecha: string;
  tipo_control: string;
  resultado: string;
  humedad: number;
  poder_germinativo: number;
  nivel_de_pureza: number;
  descripcion: string | null;
}
export interface ClienteTraza {
  id_pedido: number;
  nro_pedido: string;
  comprador: string;
  estado_pedido: string;
  fecha_pedido: string;
  bolsas: number;
}
export interface BusquedaTraza {
  lotes: { id_lote: number; nro_lote: string; semilla: string; variedad: string }[];
  partidas: { id_partida: number; nro_partida: string; nro_lote: string; semilla: string; variedad: string }[];
  clientes: { comprador: string; pedidos: number }[];
}
export interface TrazaLote {
  lote: {
    id_lote: number; nro_lote: string; origen_semilla: string; semilla: string; variedad: string;
    campo: string | null; proveedor: string | null; cantidad_actual_tn: number; fecha_ingreso: string;
    almacen: { id_almacen: number; tipo: string } | null; estado_actual: string | null;
  };
  estados: { nombre: string; desde: string; hasta: string | null; usuario: string | null }[];
  controles: ControlResumen[];
  limpiezas: { fecha: string; volumen_restante_tn: number; merma_tn: number; observaciones: string | null }[];
  partidas: {
    id_partida: number; nro_partida: string; volumen_en_tn: number; cantidad_bolsas_20kg: number;
    fecha_envasado: string | null; estado_actual: string | null; controles: ControlResumen[]; clientes: ClienteTraza[];
  }[];
}
export interface TrazaPartida {
  partida: {
    id_partida: number; nro_partida: string; volumen_en_tn: number; cantidad_bolsas_20kg: number;
    fecha_curado: string | null; fecha_envasado: string | null; estado_actual: string | null;
  };
  lote_origen: {
    id_lote: number; nro_lote: string; origen_semilla: string; semilla: string; variedad: string;
    campo: string | null; proveedor: string | null; fecha_ingreso: string;
  };
  controles_lote: ControlResumen[];
  limpiezas: { fecha: string; volumen_restante_tn: number; merma_tn: number }[];
  controles_partida: ControlResumen[];
  clientes: ClienteTraza[];
}
export interface TrazaCliente {
  comprador: string;
  pedidos: {
    id_pedido: number; nro_pedido: string; fecha_pedido: string; estado_pedido: string;
    items: {
      semilla: string; variedad: string; bolsas: number;
      partida: { id_partida: number; nro_partida: string } | null;
      lote: { id_lote: number; nro_lote: string } | null;
    }[];
  }[];
}
