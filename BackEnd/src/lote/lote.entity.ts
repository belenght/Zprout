import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Campo } from '../campo/campo.entity.js';
import { Proveedor } from '../proveedor/proveedor.entity.js';
import { TipoDeSemilla } from '../tipo_semilla/tipo_semilla.entity.js';
import { Almacen } from '../almacen/almacen.entity.js';
import { Campana } from '../campana/campana.entity.js';

export enum OrigenSemilla {
  PROPIO = 'propio',
  EXTERNO = 'externo',
}

@Entity()
export class Lote {
  [OptionalProps]?: 'id_lote' | 'fecha_ingreso' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_lote!: number;

  @Property({ unique: true })
  nro_lote!: string; // generado combinando campo + fecha (CUU01, paso 6)

  @Enum(() => OrigenSemilla)
  origen_semilla!: OrigenSemilla;

  @Property({ nullable: true })
  descripcion_origen?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  cantidad_semillas_en_tn!: string;

  @Property({ type: 'date' })
  fecha_ingreso: Date = new Date();

  @Property({ type: 'text', nullable: true })
  observaciones?: string;

  @Property({ nullable: true })
  informe_calidad_externo?: string; // path/URL del documento adjunto (CUU01, 4.a.1)

  @ManyToOne(() => Campo, { nullable: true })
  campo?: Campo;

  @ManyToOne(() => Proveedor, { nullable: true })
  proveedor?: Proveedor;

  @ManyToOne(() => TipoDeSemilla)
  tipo_semilla!: TipoDeSemilla;

  @ManyToOne(() => Almacen, { nullable: true })
  almacen?: Almacen;

  @ManyToOne(() => Campana, { nullable: true })
  campana?: Campana;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
