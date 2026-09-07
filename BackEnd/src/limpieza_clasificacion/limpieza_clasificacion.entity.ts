import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Lote } from '../lote/lote.entity.js';
import { Usuario } from '../usuario/usuario.entity.js';

@Entity()
export class LimpiezaClasificacion {
  [OptionalProps]?: 'id_limpieza' | 'fecha' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_limpieza!: number;

  @ManyToOne(() => Lote)
  lote!: Lote;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  volumen_restante_tn!: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  merma_tn!: string;

  @Property({ type: 'text', nullable: true })
  observaciones?: string;

  @ManyToOne(() => Usuario, { nullable: true })
  operario?: Usuario;

  @Property({ type: 'date' })
  fecha: Date = new Date();

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
