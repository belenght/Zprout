import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Lote } from '../lote/lote.entity.js';
import { Partida } from '../partida/partida.entity.js';

export enum TipoControl {
  INICIAL = 'inicial',
  INTERMEDIO = 'intermedio',
  FINAL = 'final',
}

export enum ResultadoControl {
  APTO = 'Apto',
  NO_APTO = 'No Apto',
}

@Entity()
export class ControlDeCalidad {
  [OptionalProps]?: 'id_control' | 'fecha' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_control!: number;

  @Property({ type: 'datetime' })
  fecha: Date = new Date();

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  humedad!: string;

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  poder_germinativo!: string;

  @Property({ type: 'decimal', precision: 5, scale: 2 })
  nivel_de_pureza!: string;

  @Enum(() => TipoControl)
  tipo_control!: TipoControl;

  @Enum(() => ResultadoControl)
  resultado!: ResultadoControl;

  @Property({ nullable: true })
  descripcion?: string;

  // Polimorfica: un control es sobre un Lote O sobre una Partida (CUU02, paso 1)
  @ManyToOne(() => Lote, { nullable: true })
  lote?: Lote;

  @ManyToOne(() => Partida, { nullable: true })
  partida?: Partida;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
