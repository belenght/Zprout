import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity()
export class User {
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