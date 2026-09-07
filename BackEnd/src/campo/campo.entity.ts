import 'reflect-metadata';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

@Entity()
export class Campo {
  [OptionalProps]?: 'id_campo' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_campo!: number;

  @Property({ unique: true })
  nro_campo!: string;

  @Property()
  ubicacion!: string;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
