export type TipoAlmacen = 'silo' | 'galpon' | 'deposito';

// DTO que llega del backend (almacen.controller.ts::conOcupacion): trae
// ocupado_tn calculado (suma de Lote.cantidad_semillas_en_tn asignados),
// no es una columna propia de la entidad.
export interface Almacen {
  id_almacen: number;
  tipo: TipoAlmacen;
  capacidad: string;
  ocupado_tn?: number;
}
