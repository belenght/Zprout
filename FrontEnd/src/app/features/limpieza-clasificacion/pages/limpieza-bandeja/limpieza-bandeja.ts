import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoteService } from '../../../lote/services/lote.service';
import { Lote } from '../../../lote/models/lote.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-limpieza-bandeja',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent],
  templateUrl: './limpieza-bandeja.html'
})
export class LimpiezaBandejaComponent implements OnInit {
  private loteService = inject(LoteService);

  cargando = signal(true);
  lotes = signal<Lote[]>([]);

  // Unico estado sobre el que tiene sentido registrar una limpieza (ver
  // limpieza_clasificacion.controller.ts: valida estado_actual === 'En limpieza').
  pendientes = computed(() => this.lotes().filter((l) => l.estado_actual === 'En limpieza'));

  ngOnInit(): void {
    this.loteService.cargarLotes();
    this.loteService.lotes$.subscribe((lotes) => {
      this.lotes.set(lotes);
      this.cargando.set(false);
    });
  }
}
