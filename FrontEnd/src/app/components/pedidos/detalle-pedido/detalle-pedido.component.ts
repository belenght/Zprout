import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PedidoService } from '../../../services/pedido.service';
import { DetallePedidoCompleto, Pedido } from '../../../interfaces/pedido';
import { AuthService } from '../../../services/auth.service';
import { claseBadgeEstadoSolido } from '../../../shared/estado-badge';

const KG_POR_BOLSA = 20;

/**
 * Detalle de un pedido (CUU07): que pidio el cliente, cuanto y cuando, y que
 * partida/bolsas se le asignaron. Usa GET /api/pedidos/:id.
 */
@Component({
  selector: 'app-detalle-pedido',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-pedido.component.html',
  styleUrl: './detalle-pedido.component.css',
})
export class DetallePedidoComponent implements OnInit {
  data: DetallePedidoCompleto | null = null;
  cargando = true;
  errorMessage: string | null = null;
  procesando = false;

  claseBadgeEstadoSolido = claseBadgeEstadoSolido;
  auth = inject(AuthService);
  private cd = inject(ChangeDetectorRef);

  constructor(
    private route: ActivatedRoute,
    private pedidoService: PedidoService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.pedidoService.getPedido(id).subscribe({
      next: (data) => {
        this.data = data;
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el pedido: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      },
    });
  }

  get pedido(): Pedido | null {
    return this.data?.pedido ?? null;
  }

  nombreSemilla(d: { tipo_semilla: any }): string {
    const ts = d.tipo_semilla;
    return ts?.nombre_semilla ? `${ts.nombre_semilla} / ${ts.variante_semilla}` : '—';
  }

  get totalSolicitadoKg(): number {
    return (this.data?.detalle ?? []).reduce((acc, d) => acc + Number(d.cantidad_solicitada_kg), 0);
  }

  get totalAsignadoKg(): number {
    return (this.data?.detalle ?? []).reduce((acc, d) => acc + (d.cantidad_asignada_bolsas ?? 0) * KG_POR_BOLSA, 0);
  }

  kgAsignados(d: { cantidad_asignada_bolsas?: number }): number {
    return (d.cantidad_asignada_bolsas ?? 0) * KG_POR_BOLSA;
  }

  private aplicar(actualizado: Pedido, mensaje: string): void {
    this.procesando = false;
    if (this.data) this.data = { ...this.data, pedido: actualizado };
    this.toastr.success(mensaje, 'Listo');
    // Las asignaciones pueden haber cambiado (reintentar): se vuelve a pedir el detalle.
    this.cargar();
  }

  private fallar(titulo: string, err: any): void {
    this.procesando = false;
    this.toastr.error(err.message, titulo);
    this.cd.detectChanges();
  }

  despachar(): void {
    if (!this.pedido) return;
    this.procesando = true;
    this.pedidoService.despacharPedido(this.pedido.id_pedido).subscribe({
      next: (p) => this.aplicar(p, `Pedido ${p.nro_pedido} despachado`),
      error: (err) => this.fallar('Error al despachar', err),
    });
  }

  cancelar(): void {
    if (!this.pedido || !confirm(`¿Cancelar el pedido ${this.pedido.nro_pedido}?`)) return;
    this.procesando = true;
    this.pedidoService.cancelarPedido(this.pedido.id_pedido).subscribe({
      next: (p) => this.aplicar(p, `Pedido ${p.nro_pedido} cancelado`),
      error: (err) => this.fallar('Error al cancelar', err),
    });
  }

  reintentar(): void {
    if (!this.pedido) return;
    this.procesando = true;
    this.pedidoService.reintentarAsignacion(this.pedido.id_pedido).subscribe({
      next: ({ pedido, stock_pendiente }) => {
        if (stock_pendiente) {
          this.procesando = false;
          this.toastr.warning('Todavia no hay stock suficiente para cubrir este pedido', 'Sigue pendiente');
          this.cargar();
        } else {
          this.aplicar(pedido, `Pedido ${pedido.nro_pedido} aprobado para despacho`);
        }
      },
      error: (err) => this.fallar('Error al reintentar', err),
    });
  }
}