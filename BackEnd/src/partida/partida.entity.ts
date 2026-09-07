import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Lote } from '../lote/lote.entity.js';

export enum TipoCurado {
  FUNGICIDA = 'fungicida',
  INSECTICIDA = 'insecticida',
  MIXTO = 'mixto',
}

@Entity()
export class Partida {
  [OptionalProps]?: 'id_partida' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_partida!: number;

  @Property({ unique: true })
  nro_partida!: string; // generado en CUU05

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  volumen_en_tn!: string;

  @Enum(() => TipoCurado)
  tipo_curado!: TipoCurado;

  @Property({ nullable: true })
  cantidad_bolsas_20kg?: number;

  @Property({ type: 'date', nullable: true })
  fecha_curado?: Date;

  @Property({ type: 'date', nullable: true })
  fecha_envasado?: Date; // se completa en CUU06, no en CUU05

  @ManyToOne(() => Lote)
  lote!: Lote;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
