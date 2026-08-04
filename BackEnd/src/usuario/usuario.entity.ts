import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

@Entity()
export class User {

  [OptionalProps]?: 'createdAt';

  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  // unique: true asegura que no haya dos usuarios con el mismo correo en la base de datos
  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property()
  createdAt: Date = new Date();
}