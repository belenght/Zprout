import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TrazabilidadService } from '../../services/extras.service';
import { BusquedaTraza, TrazaCliente, TrazaLote, TrazaPartida } from '../../interfaces/extras';
import { claseBadgeEstado } from '../../shared/estado-badge';
import { exportarCsv, fechaCsv } from '../../shared/exportar-csv';

/**
 * Trazabilidad (Vision: "trazabilidad total ante reclamos"). Buscador por
 * nro. de lote, nro. de partida o cliente. Tres vistas de solo lectura:
 *  - lote: de donde vino, que controles tuvo, que partidas dio y a que clientes llego
 *  - partida: su lote de origen y los clientes que la recibieron
 *  - cliente: que partidas y de que lotes recibio
 * La vista elegida vive en la URL (?lote=, ?partida=, ?cliente=) asi se puede compartir.
 */
@Component({
  selector: 'app-trazabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './trazabilidad.component.html',
})
export class TrazabilidadComponent implements OnInit {
  private cd = inject(ChangeDetectorRef);

  busqueda = '';
  resultados: BusquedaTraza | null = null;
  buscando = false;
  cargando = false;
  errorMessage: string | null = null;

  vistaLote: TrazaLote | null = null;
  vistaPartida: TrazaPartida | null = null;
  vistaCliente: TrazaCliente | null = null;

  claseBadgeEstado = claseBadgeEstado;

  constructor(private service: TrazabilidadService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((q) => {
      const lote = Number(q.get('lote'));
      const partida = Number(q.get('partida'));
      const cliente = q.get('cliente');
      if (lote) this.cargarLote(lote);
      else if (partida) this.cargarPartida(partida);
      else if (cliente) this.cargarCliente(cliente);
      else this.limpiarVistas();
    });
  }

  private limpiarVistas(): void {
    this.vistaLote = this.vistaPartida = this.vistaCliente = null;
    this.errorMessage = null;
    this.cd.detectChanges();
  }

  buscar(): void {
    const q = this.busqueda.trim();
    if (q.length < 2) {
      this.errorMessage = 'Escribí al menos 2 caracteres para buscar.';
      this.resultados = null;
      return;
    }
    this.errorMessage = null;
    this.buscando = true;
    this.service.buscar(q).subscribe({
      next: (r) => {
        this.resultados = r;
        this.buscando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.buscando = false;
        this.cd.detectChanges();
      },
    });
  }

  abrir(tipo: 'lote' | 'partida' | 'cliente', valor: number | string): void {
    this.router.navigate(['/trazabilidad'], { queryParams: { [tipo]: valor } });
  }

  volver(): void {
    this.router.navigate(['/trazabilidad']);
  }

  private iniciarCarga(): void {
    this.cargando = true;
    this.errorMessage = null;
    this.vistaLote = this.vistaPartida = this.vistaCliente = null;
  }

  private cargarLote(id: number): void {
    this.iniciarCarga();
    this.service.porLote(id).subscribe({
      next: (d) => { this.vistaLote = d; this.cargando = false; this.cd.detectChanges(); },
      error: (err) => { this.errorMessage = err.message; this.cargando = false; this.cd.detectChanges(); },
    });
  }

  private cargarPartida(id: number): void {
    this.iniciarCarga();
    this.service.porPartida(id).subscribe({
      next: (d) => { this.vistaPartida = d; this.cargando = false; this.cd.detectChanges(); },
      error: (err) => { this.errorMessage = err.message; this.cargando = false; this.cd.detectChanges(); },
    });
  }

  private cargarCliente(nombre: string): void {
    this.iniciarCarga();
    this.service.porCliente(nombre).subscribe({
      next: (d) => { this.vistaCliente = d; this.cargando = false; this.cd.detectChanges(); },
      error: (err) => { this.errorMessage = err.message; this.cargando = false; this.cd.detectChanges(); },
    });
  }

  get hayVista(): boolean {
    return !!(this.vistaLote || this.vistaPartida || this.vistaCliente);
  }

  hoy = new Date();

  imprimir(): void {
    this.hoy = new Date();
    this.cd.detectChanges();
    window.print();
  }

  // Excel: una fila por cliente alcanzado (o por item en la vista de cliente).
  exportar(): void {
    if (this.vistaLote) {
      const l = this.vistaLote.lote;
      const filas: (string | number)[][] = [];
      for (const p of this.vistaLote.partidas) {
        if (p.clientes.length === 0) filas.push([l.nro_lote, p.nro_partida, p.estado_actual ?? '', '', '', '', 0]);
        for (const c of p.clientes) {
          filas.push([l.nro_lote, p.nro_partida, p.estado_actual ?? '', c.comprador, c.nro_pedido, c.estado_pedido, c.bolsas]);
        }
      }
      exportarCsv(`trazabilidad-${l.nro_lote}`, ['Lote', 'Partida', 'Estado partida', 'Cliente', 'Pedido', 'Estado pedido', 'Bolsas'], filas);
    } else if (this.vistaPartida) {
      const p = this.vistaPartida;
      exportarCsv(
        `trazabilidad-${p.partida.nro_partida}`,
        ['Partida', 'Lote origen', 'Cliente', 'Pedido', 'Estado pedido', 'Bolsas'],
        p.clientes.map((c) => [p.partida.nro_partida, p.lote_origen.nro_lote, c.comprador, c.nro_pedido, c.estado_pedido, c.bolsas]),
      );
    } else if (this.vistaCliente) {
      const filas: (string | number)[][] = [];
      for (const ped of this.vistaCliente.pedidos) {
        for (const it of ped.items) {
          filas.push([ped.nro_pedido, fechaCsv(ped.fecha_pedido), ped.estado_pedido, `${it.semilla} / ${it.variedad}`, it.partida?.nro_partida ?? '', it.lote?.nro_lote ?? '', it.bolsas]);
        }
      }
      exportarCsv(`trazabilidad-cliente`, ['Pedido', 'Fecha', 'Estado', 'Semilla', 'Partida', 'Lote', 'Bolsas'], filas);
    }
  }
}
