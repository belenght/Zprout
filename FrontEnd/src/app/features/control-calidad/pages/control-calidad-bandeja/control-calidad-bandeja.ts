import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoteService } from '../../../lote/services/lote.service';
import { Lote } from '../../../lote/models/lote.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

// El backend no distingue explicitamente "necesita CC intermedio" como estado
// propio: se infiere de mejor esfuerzo a partir de estado_actual. Un lote en
// 'Pendiente CC' nunca tuvo control; uno en 'En limpieza' o 'Para curar' ya
// paso el inicial, asi que cualquier CC nuevo ahi se ofrece como intermedio.
const ETAPA_POR_ESTADO: Record<string, 'inicial' | 'intermedio'> = {
  'Pendiente CC': 'inicial',
  'En limpieza': 'intermedio',
  'Para curar': 'intermedio'
};

@Component({
  selector: 'app-control-calidad-bandeja',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent],
  templateUrl: './control-calidad-bandeja.html'
})
export class ControlCalidadBandejaComponent implements OnInit {
  private loteService = inject(LoteService);

  cargando = signal(true);
  lotes = signal<Lote[]>([]);

  pendientes = computed(() =>
    this.lotes()
      .filter((l) => l.estado_actual && ETAPA_POR_ESTADO[l.estado_actual])
      .map((l) => ({ lote: l, etapa: ETAPA_POR_ESTADO[l.estado_actual as string] }))
  );

  totalInicial = computed(() => this.pendientes().filter((p) => p.etapa === 'inicial').length);
  totalIntermedio = computed(() => this.pendientes().filter((p) => p.etapa === 'intermedio').length);

  ngOnInit(): void {
    this.loteService.cargarLotes();
    this.loteService.lotes$.subscribe((lotes) => {
      this.lotes.set(lotes);
      this.cargando.set(false);
    });
  }
}
