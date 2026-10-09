import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PedidoService } from '../../services/pedido.service';
import { Pedido, EstadoPedido } from '../../interfaces/pedido';
import { claseBadgeEstado, claseBadgeEstadoSolido } from '../../shared/estado-badge';
import { AuthService } from '../../services/auth.service';
import { exportarCsv, fechaCsv } from '../../shared/exportar-csv';

type FiltroPedido = 'Todos' | 'Aprobado' | 'Pendiente de stock' | 'Despachado' | 'Cancelado';

/**
 * GUI-16 - "Listado de pedidos". CUU07.
 */
@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pedidos.component.html',
  styleUrl: './pedidos.component.css'
})
export class PedidosComponent implements OnInit {
  pedidos: Pedido[] = [];
  cargando = true;
  errorMessage: string | null = null;
  procesando: number | null = null;

  busqueda = '';
  filtro: FiltroPedido = 'Todos';

  claseBadgeEstado = claseBadgeEstado;
  claseBadgeEstadoSolido = claseBadgeEstadoSolido;

  private cd = inject(ChangeDetectorRef);

  constructor(
    private pedidoService: PedidoService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.cargando = true;
    this.errorMessage = null;
    this.pedidoService.getPedidos().subscribe({
      next: (data) => {
        this.pedidos = data;
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar los pedidos: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }

  setFiltro(f: FiltroPedido): void {
    this.filtro = f;
  }

  auth = inject(AuthService);

  get pedidosFiltrados(): Pedido[] {
    const texto = this.busqueda.trim().toLowerCase();
    return this.pedidos.filter((p) => {
      if (this.filtro === 'Aprobado' && p.estado_pedido !== 'Aprobado para despacho') return false;
      if (this.filtro === 'Pendiente de stock' && p.estado_pedido !== 'Pendiente de stock') return false;
      if (this.filtro === 'Despachado' && p.estado_pedido !== 'Despachado') return false;
      if (this.filtro === 'Cancelado' && p.estado_pedido !== 'Cancelado') return false;
      if (!texto) return true;
      return [p.nro_pedido, p.comprador].some((v) => v.toLowerCase().includes(texto));
    });
  }

  nuevoPedido(): void {
    this.router.navigate(['/pedidos/nuevo']);
  }

  despachar(p: Pedido): void {
    this.procesando = p.id_pedido;
    this.pedidoService.despacharPedido(p.id_pedido).subscribe({
      next: (actualizado) => {
        this.procesando = null;
        this.pedidos = this.pedidos.map((x) => (x.id_pedido === actualizado.id_pedido ? actualizado : x));
        this.toastr.success(`Pedido ${actualizado.nro_pedido} despachado`, 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.procesando = null;
        this.toastr.error(err.message, 'Error al despachar');
        this.cd.detectChanges();
      }
    });
  }

  cancelar(p: Pedido): void {
    if (!confirm(`¿Cancelar el pedido ${p.nro_pedido}?`)) return;
    this.procesando = p.id_pedido;
    this.pedidoService.cancelarPedido(p.id_pedido).subscribe({
      next: (actualizado) => {
        this.procesando = null;
        this.pedidos = this.pedidos.map((x) => (x.id_pedido === actualizado.id_pedido ? actualizado : x));
        this.toastr.success(`Pedido ${actualizado.nro_pedido} cancelado`, 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.procesando = null;
        this.toastr.error(err.message, 'Error al cancelar');
        this.cd.detectChanges();
      }
    });
  }

  reintentar(p: Pedido): void {
    this.procesando = p.id_pedido;
    this.pedidoService.reintentarAsignacion(p.id_pedido).subscribe({
      next: ({ pedido, stock_pendiente }) => {
        this.procesando = null;
        this.pedidos = this.pedidos.map((x) => (x.id_pedido === pedido.id_pedido ? pedido : x));
        if (stock_pendiente) {
          this.toastr.warning('Todavia no hay stock suficiente para cubrir este pedido', 'Sigue pendiente');
        } else {
          this.toastr.success(`Pedido ${pedido.nro_pedido} aprobado para despacho`, 'Stock liberado');
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        this.procesando = null;
        this.toastr.error(err.message, 'Error al reintentar');
        this.cd.detectChanges();
      }
    });
  }

  exportar(): void {
    exportarCsv(
      'pedidos',
      ['Pedido', 'Cliente', 'Fecha pedido', 'Fecha requerida', 'Tipo', 'Estado'],
      this.pedidosFiltrados.map((p) => [p.nro_pedido, p.comprador, fechaCsv(p.fecha_pedido), fechaCsv(p.fecha_requerida), p.tipo, p.estado_pedido]),
    );
  }
}
