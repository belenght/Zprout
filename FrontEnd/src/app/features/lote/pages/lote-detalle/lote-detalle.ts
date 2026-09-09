import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { environment } from '../../../../../environments/environment';

import { LoteService } from '../../services/lote.service';
import { Lote } from '../../models/lote.model';
import { EstadoService } from '../../../estado/services/estado.service';
import { EstadoLote } from '../../../estado/models/estado.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';

// Resumen de un control de calidad, tal como lo devuelve
// GET /api/lotes/:loteId/controles-calidad (ver control_calidad.controller.ts).
// Se define ac local (no en el feature control-calidad, que todavia apunta a
// un contrato distinto del real) para no acoplar esta pantalla a ese modulo.
interface ControlCalidadResumen {
  id_control: number;
  fecha: string;
  humedad: string;
  poder_germinativo: string;
  nivel_de_pureza: string;
  tipo_control: 'inicial' | 'intermedio' | 'final';
  resultado: 'Apto' | 'No Apto';
  descripcion?: string;
}

@Component({
  selector: 'app-lote-detalle',
  standalone: true,
  imports: [RouterLink, DatePipe, LoadingSpinnerComponent],
  templateUrl: './lote-detalle.html'
})
export class LoteDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private loteService = inject(LoteService);
  private estadoService = inject(EstadoService);

  cargando = signal(true);
  lote = signal<Lote | null>(null);
  historialEstados = signal<EstadoLote[]>([]);
  controlesCalidad = signal<ControlCalidadResumen[]>([]);

  // Secuencia de referencia solo para pintar el avance visual (ver GUI-06).
  // El backend no modela un stepper multi-paso: esto es una lectura de mejor
  // esfuerzo sobre el historial real de Estado, no una maquina de estados propia.
  secuenciaReferencia: string[] = ['Pendiente CC', 'En limpieza', 'Para curar'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.loteService.getById(id).subscribe((lote) => {
      this.lote.set(lote);
      this.cargando.set(false);
    });

    this.estadoService.getHistorialLote(id).subscribe((historial) => this.historialEstados.set(historial));

    this.http
      .get<ControlCalidadResumen[]>(`${environment.apiUrl}/lotes/${id}/controles-calidad`)
      .subscribe((controles) => this.controlesCalidad.set(controles));
  }

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

  resultadoPill(resultado: string): string {
    return resultado === 'Apto' ? 'bg-brand-100 text-brand-800' : 'bg-red-100 text-red-700';
  }
}
