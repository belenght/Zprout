import 'reflect-metadata';
import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

export enum TipoAlmacen {
  SILO = 'silo',
  GALPON = 'galpon',
  DEPOSITO = 'deposito',
}

@Entity()
export class Almacen {
  [OptionalProps]?: 'id_almacen' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_almacen!: number;

  @Enum(() => TipoAlmacen)
  tipo!: TipoAlmacen;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  capacidad!: string;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
