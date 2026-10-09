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
import { EstadoService } from '../../../services/estado.service';
import { EstimacionVentaService } from '../../../services/estimacion-venta.service';
import { EstimacionVenta } from '../../../interfaces/estimacion-venta';
import { Lote } from '../../../interfaces/lote';
import { ControlDeCalidad } from '../../../interfaces/control-calidad';
import { LimpiezaClasificacion } from '../../../interfaces/limpieza';
import { Partida } from '../../../interfaces/partida';
import { EstadoHistorial } from '../../../interfaces/estado';
import { Almacen } from '../../../interfaces/almacen';
import { claseBadgeEstado } from '../../../shared/estado-badge';

// Estados de Lote desde los que corresponde ofrecer "Registrar CC" (CUU02).
// Ver BackEnd/src/estado/estado_nombres.ts (ESTADOS_LOTE).
const ESTADOS_CON_CC_PENDIENTE = ['Pendiente CC', 'En limpieza'] as const;

// Estados en los que el lote ya no avanza por el flujo normal (no hay etapa
// "actual" en el stepper).
const ESTADOS_TERMINALES = ['No apto', 'Venta como grano', 'Descarte'] as const;

export type EstadoEtapa = 'hecho' | 'actual' | 'pendiente';

export interface EtapaLote {
  label: string;
  estado: EstadoEtapa;
}

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
  estados: EstadoHistorial[] = [];
  partidas: Partida[] = [];
  almacenes: Almacen[] = [];
  estimacion: EstimacionVenta | null = null;
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
    private estadoService: EstadoService,
    private estimacionVentaService: EstimacionVentaService,
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

    this.estadoService.getHistorialPorLote(id).subscribe({
      next: (data) => {
        this.estados = data;
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

    // Estimacion de venta del lote (tarjeta "Estimacion de venta" + etapa
    // "Est. venta" del stepper). Filtra server-side por lote_id.
    this.estimacionVentaService.getEstimaciones(id).subscribe({
      next: (data) => {
        this.estimacion = data[0] ?? null;
        this.cd.detectChanges();
      },
      error: () => {
        // Informativo: si falla, la tarjeta muestra "sin estimacion".
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

  // ---- Tarjeta "Calidad inicial" -------------------------------------------

  get controlInicial(): ControlDeCalidad | null {
    return this.controles.find((c) => c.tipo_control === 'inicial') ?? null;
  }

  // ---- Tarjeta "Datos del lote" --------------------------------------------
  // Al registrar una limpieza el backend deja en lote.cantidad_semillas_en_tn
  // solo el volumen restante (ver limpieza_clasificacion.controller.ts), asi
  // que lo ingresado originalmente se reconstruye como restante + merma.

  get ultimaLimpieza(): LimpiezaClasificacion | null {
    if (this.limpiezas.length === 0) return null;
    return [...this.limpiezas].sort(
      (a, b) => new Date(b.fecha ?? 0).getTime() - new Date(a.fecha ?? 0).getTime()
    )[0];
  }

  get kgPostLimpieza(): number | null {
    const l = this.ultimaLimpieza;
    return l ? Number(l.volumen_restante_tn) : null;
  }

  get mermaTotal(): number | null {
    if (this.limpiezas.length === 0) return null;
    return this.limpiezas.reduce((suma, l) => suma + Number(l.merma_tn), 0);
  }

  get kgIngresados(): number | null {
    if (!this.lote) return null;
    if (this.kgPostLimpieza != null && this.mermaTotal != null) {
      return this.kgPostLimpieza + this.mermaTotal;
    }
    return Number(this.lote.cantidad_semillas_en_tn);
  }

  // ---- Tarjeta "Estimacion de venta" ---------------------------------------

  get nombreCampana(): string {
    const c = this.estimacion?.campana as any;
    return c?.nombre ?? '';
  }

  get volumenEstimado(): number | null {
    return this.estimacion ? Number(this.estimacion.volumen_estimado_tn) : null;
  }

  // Volumen que ya paso a curado (suma de las partidas generadas del lote).
  get volumenCurado(): number {
    return this.partidas.reduce((suma, p) => suma + Number(p.volumen_en_tn), 0);
  }

  // Stock disponible: solo las bolsas de partidas ya habilitadas para venta.
  get stockBolsas(): number {
    return this.partidas
      .filter((p) => p.estado_actual === 'Apto para comercializacion')
      .reduce((suma, p) => suma + (p.cantidad_bolsas_20kg ?? 0), 0);
  }

  // ---- Stepper de etapas ----------------------------------------------------
  // Cada etapa se marca como hecha segun los datos reales del lote; la etapa
  // "actual" es la primera que todavia no esta hecha (salvo en estados
  // terminales, donde el lote ya no sigue el flujo).

  get etapas(): EtapaLote[] {
    const hayControl = (tipo: string) => this.controles.some((c) => c.tipo_control === tipo);
    const partidaEn = (...estados: string[]) =>
      this.partidas.some((p) => estados.includes(p.estado_actual ?? ''));

    const etapas: { label: string; hecha: boolean }[] = [
      { label: 'Ingreso', hecha: !!this.lote },
      { label: 'CC inicial', hecha: hayControl('inicial') },
      { label: 'Limpieza', hecha: this.limpiezas.length > 0 },
      { label: 'CC interm.', hecha: hayControl('intermedio') },
      { label: 'Est. venta', hecha: !!this.estimacion },
      { label: 'Curado', hecha: this.partidas.length > 0 },
      { label: 'CC final', hecha: partidaEn('Apto para comercializacion', 'Rechazado') },
      { label: 'Habilitado', hecha: partidaEn('Apto para comercializacion') },
    ];

    const terminal = ESTADOS_TERMINALES.includes(this.lote?.estado_actual as any);
    const indiceActual = terminal ? -1 : etapas.findIndex((e) => !e.hecha);

    return etapas.map((e, i) => ({
      label: e.label,
      estado: e.hecha ? 'hecho' : i === indiceActual ? 'actual' : 'pendiente',
    }));
  }

  // ---- Estilos --------------------------------------------------------------

  // Badge solido de la cabecera (boceto GUI-06: "Para curar" en dorado).
  get claseBadgeCabecera(): string {
    const porEstado: Record<string, string> = {
      'Pendiente CC': 'bg-amber-500',
      'En limpieza': 'bg-blue-600',
      'Para curar': 'bg-gold-500',
      'No apto': 'bg-red-600',
      'Venta como grano': 'bg-brand-600',
      Descarte: 'bg-red-700',
    };
    return porEstado[this.lote?.estado_actual ?? ''] ?? 'bg-gray-500';
  }

  claseResultado(resultado: string | null | undefined): string {
    return resultado === 'Apto' ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700';
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