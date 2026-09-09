import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LoteService } from '../../services/lote.service';
import { Lote } from '../../models/lote.model';
import { NombreEstadoLote } from '../../../estado/models/estado.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

type FiltroEstado = 'Todos' | NombreEstadoLote;

@Component({
  selector: 'app-lote-list',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, LoadingSpinnerComponent],
  templateUrl: './lote-list.html'
})
export class LoteListComponent implements OnInit {
  private service = inject(LoteService);

  // Vocabulario real de estados de Lote (ver estado_nombres.ts del backend).
  // "Habilitado" de la GUI no existe a nivel Lote: ese es un estado de Partida.
  filtros: FiltroEstado[] = ['Todos', 'Pendiente CC', 'En limpieza', 'Para curar', 'No apto', 'Venta como grano', 'Descarte'];
  filtroActivo = signal<FiltroEstado>('Todos');
  busqueda = signal('');

  lotesCrudos = signal<Lote[]>([]);
  cargando = signal(true);

  // GET /api/lotes no soporta filtros por query: se filtra todo del lado del cliente.
  lotes = computed(() => {
    const filtro = this.filtroActivo();
    const texto = this.busqueda().trim().toLowerCase();

    return this.lotesCrudos().filter((l) => {
      const pasaEstado = filtro === 'Todos' || l.estado_actual === filtro;
      const pasaTexto =
        !texto ||
        l.nro_lote.toLowerCase().includes(texto) ||
        l.tipo_semilla.nombre_semilla.toLowerCase().includes(texto) ||
        l.tipo_semilla.variante_semilla.toLowerCase().includes(texto);
      return pasaEstado && pasaTexto;
    });
  });

  ngOnInit(): void {
    this.service.lotes$.subscribe((lotes) => this.lotesCrudos.set(lotes));
    this.service.cargando$.subscribe((cargando) => this.cargando.set(cargando));
    this.service.cargarLotes();
  }

  seleccionarFiltro(filtro: FiltroEstado): void {
    this.filtroActivo.set(filtro);
  }

  // Origen de procedencia para mostrar en la tabla: nro de campo si es propio,
  // razon social del proveedor si es externo.
  procedencia(lote: Lote): string {
    if (lote.origen_semilla === 'propio') return lote.campo?.nro_campo ?? '—';
    return lote.proveedor?.razon_social ?? '—';
  }

  estadoPill(estado: string | null | undefined): string {
    switch (estado) {
      case 'Pendiente CC': return 'bg-amber-100 text-amber-800';
      case 'En limpieza': return 'bg-amber-100 text-amber-800';
      case 'Para curar': return 'bg-brand-100 text-brand-800';
      case 'No apto': return 'bg-red-100 text-red-700';
      case 'Venta como grano': return 'bg-sky-100 text-sky-800';
      case 'Descarte': return 'bg-stone-200 text-stone-700';
      default: return 'bg-stone-100 text-stone-500';
    }
  }
}
