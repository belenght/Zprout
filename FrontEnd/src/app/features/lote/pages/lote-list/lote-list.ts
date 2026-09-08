import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { LoteService } from '../../services/lote.service';
import { Lote } from '../../models/lote.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

type FiltroEstado = 'Todos' | 'Pendiente CC' | 'En limpieza' | 'Para curar' | 'Habilitado';

@Component({
  selector: 'app-lote-list',
  standalone: true,
  imports: [RouterLink, FormsModule, MatTableModule, DatePipe, LoadingSpinnerComponent],
  templateUrl: './lote-list.html'
})
export class LoteListComponent implements OnInit {
  private service = inject(LoteService);

  columnas = ['nro_lote', 'origen_semilla', 'cantidad_semillas_en_tn', 'estado_actual', 'fecha_creacion'];

  filtros: FiltroEstado[] = ['Todos', 'Pendiente CC', 'En limpieza', 'Para curar', 'Habilitado'];
  filtroActivo = signal<FiltroEstado>('Todos');
  busqueda = '';

  lotes = signal<Lote[]>([]);
  cargando = signal(true);

  ngOnInit(): void {
    this.service.lotes$.subscribe((lotes) => this.lotes.set(lotes));
    this.service.cargando$.subscribe((cargando) => this.cargando.set(cargando));
    this.buscar();
  }

  seleccionarFiltro(filtro: FiltroEstado): void {
    this.filtroActivo.set(filtro);
    this.buscar();
  }

  buscar(): void {
    this.service.cargarLotes(this.filtroActivo(), this.busqueda);
  }
}
