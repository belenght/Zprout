import 'reflect-metadata';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

/**
 * Bitacora de acciones sensibles (gestion de usuarios, destino de lotes, etc.).
 * Se guarda el nombre de usuario como texto (no como relacion) a proposito:
 * el registro tiene que sobrevivir aunque la cuenta se elimine o se renombre.
 */
@Entity()
export class Bitacora {
  [OptionalProps]?: 'id_bitacora' | 'fecha';
  @PrimaryKey()
  id_bitacora!: number;

  @Property({ type: 'datetime' })
  fecha: Date = new Date();

  @Property({ nullable: true })
  id_usuario_actor?: number;

  @Property()
  usuario_actor!: string; // nombre_usuario de quien hizo la accion

  @Property()
  accion!: string; // ej: 'usuario.editar', 'lote.destino'

  @Property({ nullable: true })
  objetivo?: string; // sobre que/quien (ej: '@carla', 'L-C-01-...')

  @Property({ type: 'text', nullable: true })
  detalle?: string;
}
