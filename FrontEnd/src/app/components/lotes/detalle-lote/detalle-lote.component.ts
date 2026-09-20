import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoteService } from '../../../services/lote.service';
import { ControlCalidadService } from '../../../services/control-calidad.service';
import { LimpiezaService } from '../../../services/limpieza.service';
import { PartidaService } from '../../../services/partida.service';
import { AlmacenService } from '../../../services/almacen.service';
import { Lote } from '../../../interfaces/lote';
import { ControlDeCalidad } from '../../../interfaces/control-calidad';
import { LimpiezaClasificacion } from '../../../interfaces/limpieza';
import { Partida } from '../../../interfaces/partida';
import { Almacen } from '../../../interfaces/almacen';
import { claseBadgeEstado } from '../../../shared/estado-badge';

// Estados de Lote desde los que corresponde ofrecer "Registrar CC" (CUU02).
// Ver BackEnd/src/estado/estado_nombres.ts (ESTADOS_LOTE).
const ESTADOS_CON_CC_PENDIENTE = ['Pendiente CC', 'En limpieza'] as const;

@Component({
  selector: 'app-detalle-lote',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './detalle-lote.component.html',
  styleUrl: './detalle-lote.component.css'
})
export class DetalleLoteComponent implements OnInit {
  lote: Lote | null = null;
  controles: ControlDeCalidad[] = [];
  limpiezas: LimpiezaClasificacion[] = [];
  partidas: Partida[] = [];
  almacenes: Almacen[] = [];
  almacenSeleccionado: number | null = null;
  asignandoAlmacen = false;
  cargando = true;
  errorMessage: string | null = null;

  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private route: ActivatedRoute,
    private loteService: LoteService,
    private controlCalidadService: ControlCalidadService,
    private limpiezaService: LimpiezaService,
    private partidaService: PartidaService,
    private almacenService: AlmacenService,
    private toastr: ToastrService
  ) {}

  claseBadgeEstado = claseBadgeEstado;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loteService.getLote(id).subscribe({
      next: (data) => {
        this.lote = data;
        this.almacenSeleccionado = (data.almacen as any)?.id_almacen ?? null;
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el lote: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });

    this.controlCalidadService.getControlesPorLote(id).subscribe({
      next: (data) => {
        this.controles = data;
        this.cd.detectChanges();
      },
      error: () => {
        // Historial informativo: si falla no bloquea la vista de detalle.
      }
    });

    this.limpiezaService.getLimpiezasPorLote(id).subscribe({
      next: (data) => {
        this.limpiezas = data;
        this.cd.detectChanges();
      },
      error: () => {
        // Historial informativo: si falla no bloquea la vista de detalle.
      }
    });

    // CUU05/CUU06: partidas generadas a partir de este lote (no hay
    // endpoint filtrado por lote todavia, asi que se filtra en el cliente).
    this.partidaService.getPartidas().subscribe({
      next: (data) => {
        this.partidas = data.filter((p) => (p.lote as any)?.id_lote === id);
        this.cd.detectChanges();
      },
      error: () => {
        // Historial informativo: si falla no bloquea la vista de detalle.
      }
    });

    this.almacenService.getAlmacenes().subscribe({
      next: (data) => {
        this.almacenes = data;
        this.cd.detectChanges();
      },
      error: () => {
        // El selector de almacen es un extra; si falla no bloquea el resto.
      }
    });
  }

  asignarAlmacen(): void {
    if (!this.lote?.id_lote || this.almacenSeleccionado == null) return;
    this.asignandoAlmacen = true;
    this.loteService.asignarAlmacen(this.lote.id_lote, this.almacenSeleccionado).subscribe({
      next: (actualizado) => {
        this.lote = actualizado;
        this.asignandoAlmacen = false;
        this.toastr.success('Almacen asignado', 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.asignandoAlmacen = false;
        this.toastr.error(err.message, 'Error al asignar el almacen');
        this.cd.detectChanges();
      }
    });
  }

  // CUU02, paso 1: habilita "Registrar control de calidad" solo cuando el
  // lote esta en un estado que efectivamente espera un CC (inicial o
  // intermedio).
  get puedeRegistrarCC(): boolean {
    return !!this.lote && ESTADOS_CON_CC_PENDIENTE.includes(this.lote.estado_actual as any);
  }

  get tipoControlSugerido(): 'inicial' | 'intermedio' {
    return this.lote?.estado_actual === 'En limpieza' ? 'intermedio' : 'inicial';
  }

  // CUU03, precondicion: el lote debe estar "En limpieza" para registrar el
  // procesamiento fisico (ver limpieza_clasificacion.controller.ts).
  get puedeRegistrarLimpieza(): boolean {
    return this.lote?.estado_actual === 'En limpieza';
  }

  // CUU05, precondicion: el lote debe estar "Para curar".
  get puedeRegistrarCurado(): boolean {
    return this.lote?.estado_actual === 'Para curar';
  }

  get puedeRegistrarAlgunaAccion(): boolean {
    return this.puedeRegistrarCC || this.puedeRegistrarLimpieza || this.puedeRegistrarCurado;
  }

  // Helpers para el template - las relaciones vienen populadas desde el
  // backend (ver lote.controller.ts::conEstadoActual), pero tipadas como
  // union con number en la interface, asi que se castea con $any en el html
  // o se accede via estos getters.
  get nombreSemilla(): string {
    const ts = this.lote?.tipo_semilla as any;
    return ts?.nombre_semilla ? `${ts.nombre_semilla} / ${ts.variante_semilla}` : '';
  }

  get origenTexto(): string {
    if (!this.lote) return '';
    if (this.lote.origen_semilla === 'propio') {
      const c = this.lote.campo as any;
      return c?.nro_campo ? `Propio (${c.nro_campo} - ${c.ubicacion})` : 'Propio';
    }
    const p = this.lote.proveedor as any;
    return p?.razon_social ? `Externo (${p.razon_social})` : 'Externo';
  }
}