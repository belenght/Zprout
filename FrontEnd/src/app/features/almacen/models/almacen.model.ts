// Coincide con almacen.entity.ts del backend.
export type TipoAlmacen = 'silo' | 'galpon' | 'deposito';

export interface Almacen {
  id_almacen: number;
  tipo: TipoAlmacen;
  capacidad: string; // decimal del backend, en tn

  // Agregado a mano por el backend (no es una columna de Almacen, ver
  // almacen.controller.ts -> conOcupacion): suma de Lote.cantidad_semillas_en_tn
  // para los lotes que hoy tienen este almacen asignado.
  // El Modelo de Dominio (Copia_de_Modelo_de_dominio_Zprout) no define ninguna
  // relacion entre Partida y Almacen, asi que los almacenes de tipo 'deposito'
  // (pensados para bolsas envasadas) no tienen forma de calcular ocupacion
  // real todavia -- haria falta agregar esa relacion al modelo primero.
  ocupado_tn: number;
}

export type AlmacenPayload = Omit<Almacen, 'id_almacen' | 'ocupado_tn'>;
