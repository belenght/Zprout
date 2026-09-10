import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlmacenService } from '../../services/almacen.service';
import { Almacen, TipoAlmacen } from '../../models/almacen.model';
import { LoteService } from '../../../lote/services/lote.service';
import { Lote } from '../../../lote/models/lote.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

interface FilaStock {
  semilla: string;
  variedad: string;
  aGranelTn: number;
}

const ETIQUETA_TIPO: Record<TipoAlmacen, string> = {
  silo: 'Silo',
  galpon: 'Galpón',
  deposito: 'Depósito'
};

@Component({
  selector: 'app-almacen-list',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent],
  templateUrl: './almacen-list.html'
})
export class AlmacenListComponent implements OnInit {
  private almacenService = inject(AlmacenService);
  private loteService = inject(LoteService);

  cargando = signal(true);
  almacenes = signal<Almacen[]>([]);
  lotes = signal<Lote[]>([]);

  etiquetaTipo = (t: TipoAlmacen) => ETIQUETA_TIPO[t];

  porcentaje(a: Almacen): number {
    const capacidad = Number(a.capacidad);
    if (!capacidad) return 0;
    return Math.min(100, Math.round((a.ocupado_tn / capacidad) * 100));
  }

  // Solo lo que hoy tiene un almacen asignado (relacion Lote-Almacen del
  // Modelo de Dominio). No incluye lo envasado: ese stock no tiene relacion
  // con Almacen en el modelo, ver nota en almacen.model.ts.
  stockGranel = computed<FilaStock[]>(() => {
    const grupos = new Map<string, FilaStock>();
    for (const lote of this.lotes()) {
      if (!lote.almacen) continue;
      const key = `${lote.tipo_semilla.nombre_semilla}__${lote.tipo_semilla.variante_semilla}`;
      const fila = grupos.get(key) ?? {
        semilla: lote.tipo_semilla.nombre_semilla,
        variedad: lote.tipo_semilla.variante_semilla,
        aGranelTn: 0
      };
      fila.aGranelTn += Number(lote.cantidad_semillas_en_tn);
      grupos.set(key, fila);
    }
    return Array.from(grupos.values());
  });

  ngOnInit(): void {
    this.almacenService.getAll().subscribe((data) => {
      this.almacenes.set(data);
      this.cargando.set(false);
    });
    this.loteService.cargarLotes();
    this.loteService.lotes$.subscribe((lotes) => this.lotes.set(lotes));
  }
}
