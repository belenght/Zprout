import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Lote } from '../lote/lote.entity.js';
import { Partida } from '../partida/partida.entity.js';

/**
 * Estado es polimorfica: cada fila es un "evento" del historial de estados
 * de un Lote O de una Partida (nunca ambos a la vez). Sigue el mismo patron
 * que ControlDeCalidad. FechaDesde/FechaHasta viven aca porque asi las
 * definio el Modelo de Dominio (no hay una tabla intermedia LoteEstado /
 * PartidaEstado separada).
 */
@Entity()
export class Estado {
  [OptionalProps]?: 'id_estado' | 'fecha_desde' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_estado!: number;

  @Property()
  nombre!: string; // ver estado_nombres.ts para los valores validos por entidad

  @Property({ type: 'datetime' })
  fecha_desde: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  fecha_hasta?: Date | null; // se completa cuando el objeto pasa al siguiente estado

  @ManyToOne(() => Lote, { nullable: true })
  lote?: Lote;

  @ManyToOne(() => Partida, { nullable: true })
  partida?: Partida;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
