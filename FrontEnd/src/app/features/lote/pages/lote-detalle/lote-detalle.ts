import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';

import { LoteService } from '../../services/lote.service';
import { Lote } from '../../models/lote.model';
import { EstadoService } from '../../../estado/services/estado.service';
import { EstadoLote } from '../../../estado/models/estado.model';
import { AlmacenService } from '../../../almacen/services/almacen.service';
import { Almacen } from '../../../almacen/models/almacen.model';
import { NotificationService } from '../../../../core/services/notification.service';
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
  imports: [RouterLink, DatePipe, FormsModule, LoadingSpinnerComponent],
  templateUrl: './lote-detalle.html'
})
export class LoteDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private loteService = inject(LoteService);
  private estadoService = inject(EstadoService);
  private almacenService = inject(AlmacenService);
  private notification = inject(NotificationService);

  cargando = signal(true);
  lote = signal<Lote | null>(null);
  historialEstados = signal<EstadoLote[]>([]);
  controlesCalidad = signal<ControlCalidadResumen[]>([]);

  // Solo silo/galpon tiene sentido para un Lote (deposito es para Partida
  // ya envasada, ver almacen-list). Se filtra ac mismo, no en el servicio,
  // para no acoplar AlmacenService a una regla que es propia de esta pantalla.
  almacenesDisponibles = signal<Almacen[]>([]);
  almacenSeleccionado = signal<number | null>(null);
  guardandoAlmacen = signal(false);

  // Secuencia de referencia solo para pintar el avance visual (ver GUI-06).
  // El backend no modela un stepper multi-paso: esto es una lectura de mejor
  // esfuerzo sobre el historial real de Estado, no una maquina de estados propia.
  secuenciaReferencia: string[] = ['Pendiente CC', 'En limpieza', 'Para curar'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.loteService.getById(id).subscribe((lote) => {
      this.lote.set(lote);
      this.almacenSeleccionado.set(lote.almacen?.id_almacen ?? null);
      this.cargando.set(false);
    });

    this.almacenService.getAll().subscribe((almacenes) =>
      this.almacenesDisponibles.set(almacenes.filter((a) => a.tipo === 'silo' || a.tipo === 'galpon'))
    );

    this.estadoService.getHistorialLote(id).subscribe((historial) => this.historialEstados.set(historial));

    this.http
      .get<ControlCalidadResumen[]>(`${environment.apiUrl}/lotes/${id}/controles-calidad`)
      .subscribe((controles) => this.controlesCalidad.set(controles));
  }

  guardarAlmacen(): void {
    const lote = this.lote();
    if (!lote) return;

    this.guardandoAlmacen.set(true);
    this.almacenService.asignarLote(lote.id_lote, this.almacenSeleccionado()).subscribe({
      next: () => {
        this.guardandoAlmacen.set(false);
        this.notification.success('Almacén actualizado.');
      },
      error: () => this.guardandoAlmacen.set(false)
    });
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

  // Mismo criterio que control-calidad-bandeja: estos son los estados de
  // Lote sobre los que todavia tiene sentido registrar un control de calidad.
  necesitaCC(estado: string | null | undefined): boolean {
    return estado === 'Pendiente CC' || estado === 'En limpieza' || estado === 'Para curar';
  }
}
