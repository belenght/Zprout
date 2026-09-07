import 'reflect-metadata';
import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';

export enum TipoPedido {
  HIBRIDA = 'hibrida',
  GRANO = 'grano',
}

export enum EstadoPedido {
  APROBADO_PARA_DESPACHO = 'Aprobado para despacho',
  PENDIENTE_DE_STOCK = 'Pendiente de stock',
}

@Entity()
export class Pedido {
  [OptionalProps]?: 'id_pedido' | 'fecha_pedido' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_pedido!: number;

  @Property({ unique: true })
  nro_pedido!: string;

  @Property({ type: 'date' })
  fecha_pedido: Date = new Date();

  @Property({ type: 'date' })
  fecha_requerida!: Date;

  @Property()
  comprador!: string; // Razon Social

  @Enum(() => TipoPedido)
  tipo!: TipoPedido;

  @Enum(() => EstadoPedido)
  estado_pedido!: EstadoPedido;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
