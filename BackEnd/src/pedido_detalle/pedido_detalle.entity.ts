import 'reflect-metadata';
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { OptionalProps } from '@mikro-orm/core';
import { Pedido } from '../pedido/pedido.entity.js';
import { TipoDeSemilla } from '../tipo_semilla/tipo_semilla.entity.js';
import { Partida } from '../partida/partida.entity.js';

// Es el "PedidoXSemilla" del Modelo de Dominio.
@Entity()
export class PedidoDetalle {
  [OptionalProps]?: 'id_pedido_detalle' | 'created_at' | 'updated_at';
  @PrimaryKey()
  id_pedido_detalle!: number;

  @ManyToOne(() => Pedido)
  pedido!: Pedido;

  @ManyToOne(() => TipoDeSemilla)
  tipo_semilla!: TipoDeSemilla;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  cantidad_solicitada_kg!: string;

  // Nullable: si el pedido queda "Pendiente de stock" todavia no hay partida asignada
  @ManyToOne(() => Partida, { nullable: true })
  partida_asignada?: Partida;

  @Property({ nullable: true })
  cantidad_asignada_bolsas?: number;

  @Property({ type: 'datetime' })
  created_at: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updated_at: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  deleted_at?: Date | null;
}
