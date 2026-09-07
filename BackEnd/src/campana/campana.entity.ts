import 'reflect-metadata';
import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

@Entity()
export class Campana {
  [OptionalProps]?: 'id_campana' | 'vigente' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_campana!: number;

  @Property({ unique: true })
  nombre!: string; // ej: "2025/2026"

  @Property({ type: 'date' })
  fecha_inicio!: Date;

  @Property({ type: 'date', nullable: true })
  fecha_fin?: Date;

  // Marca cual es la campaña vigente (usada por CUU08 - Dashboard)
  @Property({ default: false })
  vigente: boolean = false;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
