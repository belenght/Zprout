import 'reflect-metadata';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

@Entity()
export class Proveedor {
  [OptionalProps]?: 'id_proveedor' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_proveedor!: number;

  @Property({ unique: true })
  razon_social!: string;

  @Property({ nullable: true })
  cuit?: string;

  @Property({ nullable: true })
  contacto?: string;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
