import 'reflect-metadata';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

@Entity()
export class Insumo {
  [OptionalProps]?: 'id_insumo' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_insumo!: number;

  @Property({ unique: true })
  nombre_insumo!: string;

  @Property({ nullable: true })
  unidad_medida?: string;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
