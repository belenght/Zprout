import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Lote } from '../lote/lote.entity.js';
import { Campana } from '../campana/campana.entity.js';

@Entity()
export class EstimacionVenta {
  [OptionalProps]?: 'id_estimacion' | 'fecha_carga' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_estimacion!: number;

  @ManyToOne(() => Lote)
  lote!: Lote;

  @ManyToOne(() => Campana)
  campana!: Campana;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  volumen_estimado_tn!: string;

  @Property({ type: 'date' })
  fecha_carga: Date = new Date();

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
