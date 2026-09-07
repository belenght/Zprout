import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Partida } from '../partida/partida.entity.js';
import { Insumo } from '../insumo/insumo.entity.js';

@Entity()
export class PartidaInsumo {
  [OptionalProps]?: 'id_partida_insumo' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_partida_insumo!: number;

  @ManyToOne(() => Partida)
  partida!: Partida;

  @ManyToOne(() => Insumo)
  insumo!: Insumo;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  cantidad!: string;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
