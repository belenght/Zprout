import 'reflect-metadata';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

@Entity()
export class TipoDeSemilla {
  [OptionalProps]?: 'id_semilla' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_semilla!: number;

  @Property()
  nombre_semilla!: string;

  @Property()
  variante_semilla!: string;

  // Rangos permitidos, usados por CUU02 y CUU06 para validar controles de calidad
  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humedad_min?: string;

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humedad_max?: string;

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  poder_germinativo_min?: string;

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  poder_germinativo_max?: string;

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  nivel_pureza_min?: string;

  @Property({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  nivel_pureza_max?: string;

  @Property({ nullable: true })
  duracion?: string;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
