import 'reflect-metadata';
import { Entity, PrimaryKey, Property, OneToOne } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Rol } from '../rol/rol.entity.js';

@Entity()
export class Usuario {
  [OptionalProps]?: 'id_usuario' | 'activo' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_usuario!: number;

  @Property()
  nombre!: string;

  @Property()
  apellido!: string;

  @Property({ unique: true })
  nombre_usuario!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  password!: string;

  @Property({ type: 'date', nullable: true })
  fecha_nacimiento?: Date;

  @Property({ type: 'blob', columnType: 'mediumblob', nullable: true })
  foto_perfil?: Buffer;

  @Property({ default: true })
  activo: boolean = true;

  @OneToOne(() => Rol, { nullable: true, owner: true })
  rol?: Rol;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
