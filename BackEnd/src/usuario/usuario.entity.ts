import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Rol } from '../rol/rol.entity.js';

export type EstadoUsuario = 'pendiente' | 'activo' | 'rechazado';

@Entity()
export class Usuario {
  [OptionalProps]?: 'id_usuario' | 'activo' | 'estado' | 'created_at' | 'updated_at';
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

  // Baja/deshabilitacion de una cuenta ya existente.
  @Property({ default: true })
  activo: boolean = true;

  // Flujo de alta: el registro publico crea 'pendiente'; el admin pasa a
  // 'activo' o 'rechazado'. Default 'activo' para que las filas existentes
  // (el admin del seed) y los usuarios creados por un admin queden operativos.
  @Property({ type: 'string', default: 'activo' })
  estado: EstadoUsuario = 'activo';

  // Antes OneToOne: eso crea un indice UNIQUE sobre rol_id y solo permitia un
  // usuario por rol. Tiene que ser ManyToOne.
  @ManyToOne(() => Rol, { nullable: true })
  rol?: Rol;

  // Rol que pidio la persona al registrarse. Es solo una peticion: el rol
  // efectivo (arriba) lo asigna el admin al aprobar.
  @ManyToOne(() => Rol, { nullable: true })
  rol_solicitado?: Rol;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}