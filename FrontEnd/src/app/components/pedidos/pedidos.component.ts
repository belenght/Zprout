import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Espejo de BackEnd/src/pedido/pedido.entity.ts (EstadoPedido). Si el backend
// agrega un estado nuevo, agregarlo tambien aca.
type EstadoPedido = 'Aprobado para despacho' | 'Pendiente de stock';

interface PedidoResumen {
  nro_pedido: string;
  comprador: string;
  fecha_pedido: string;
  estado_pedido: EstadoPedido;
}

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.css'
})
export class PedidosComponent {
  // Datos de ejemplo (GUI-16). El backend ya tiene pedido.controller.ts;
  // falta el service + la conexion real en el front.
  pedidos: PedidoResumen[] = [
    { nro_pedido: 'PED-2026-014', comprador: 'AgroExport S.A.', fecha_pedido: '12/06/26', estado_pedido: 'Aprobado para despacho' },
    { nro_pedido: 'PED-2026-013', comprador: 'Cruz del Sur S.R.L.', fecha_pedido: '10/06/26', estado_pedido: 'Pendiente de stock' },
  ];

  claseEstado(estado: EstadoPedido): string {
    return estado === 'Aprobado para despacho'
      ? 'bg-brand-100 text-brand-800'
      : 'bg-amber-100 text-amber-800';
  }
}
