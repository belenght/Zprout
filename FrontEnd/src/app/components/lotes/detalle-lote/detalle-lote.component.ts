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
import { AuthService } from '../../../services/auth.service';
import { claseBadgeEstado } from '../../../shared/estado-badge';

// Estados en los que el lote ya no avanza por el flujo normal (no hay etapa
// "actual" en el stepper).
const ESTADOS_TERMINALES = ['No apto', 'Venta como grano', 'Descarte'] as const;

// hecho = completada; actual = la que sigue; pendiente = todavia no; omitida = no aplica
// a este lote (ej. lote externo no se limpia); opcional = no bloquea el avance;
// detenida = el lote quedo cortado en esa etapa (No apto / destino).
export type EstadoEtapa = 'hecho' | 'actual' | 'pendiente' | 'omitida' | 'opcional' | 'detenida';

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
    private toastr: ToastrService,
    public auth: AuthService
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

  // ---- Proximo paso del proceso ---------------------------------------------
  // Lo calcula el backend (proximo_paso) siguiendo CUU02/03/05 y las maquinas de
  // estado: CC inicial -> limpieza -> CC intermedio -> curado.
  get proximoPaso(): string | null {
    return this.lote?.proximo_paso ?? null;
  }

  // CC intermedio extra: RN 13 (mucho tiempo en "Para curar" -> segundo control antes de curar).
  get puedeSegundoCC(): boolean {
    return this.proximoPaso === 'curado' && !!this.lote?.puede_segundo_cc;
  }

  get puedeRegistrarCC(): boolean {
    return this.proximoPaso === 'cc_inicial' || this.proximoPaso === 'cc_intermedio' || this.puedeSegundoCC;
  }

  get tipoControlSugerido(): 'inicial' | 'intermedio' {
    return this.proximoPaso === 'cc_inicial' ? 'inicial' : 'intermedio';
  }

  // CUU03, precondicion: el lote debe estar "En limpieza".
  get puedeRegistrarLimpieza(): boolean {
    return this.proximoPaso === 'limpieza';
  }

  // CUU05, precondicion: lote "Para curar" (y, si se limpio, con CC intermedio apto).
  get puedeRegistrarCurado(): boolean {
    return this.proximoPaso === 'curado';
  }

  // Cada accion se muestra solo si el estado del lote la admite Y el rol del
  // usuario tiene permiso (ver shared/permisos.ts).
  get verCC(): boolean { return this.puedeRegistrarCC && this.auth.puede('calidad.registrar'); }
  get verLimpieza(): boolean { return this.puedeRegistrarLimpieza && this.auth.puede('limpieza.registrar'); }
  get verCurado(): boolean { return this.puedeRegistrarCurado && this.auth.puede('curado.registrar'); }

  // Un lote "No apto" espera una decision: venta como grano o descarte.
  get esNoApto(): boolean {
    return this.lote?.estado_actual === 'No apto';
  }
  get verDestino(): boolean {
    return this.esNoApto && this.auth.puede('lotes.destino');
  }

  get puedeRegistrarAlgunaAccion(): boolean {
    return this.verCC || this.verLimpieza || this.verCurado || this.verDestino;
  }

  // El CC es el paso principal salvo que sea el "segundo control" opcional.
  get ccEsPrincipal(): boolean {
    return this.proximoPaso === 'cc_inicial' || this.proximoPaso === 'cc_intermedio';
  }

  // Texto de "que sigue", en lenguaje del proceso y con el responsable.
  get textoSiguiente(): string {
    switch (this.proximoPaso) {
      case 'cc_inicial': return 'Siguiente paso: control de calidad inicial (Responsable de Calidad).';
      case 'limpieza': return 'Siguiente paso: registrar la limpieza y clasificación (Operario de Planta).';
      case 'cc_intermedio': return 'Siguiente paso: control de calidad intermedio del lote ya limpio (Responsable de Calidad).';
      case 'curado':
        return this.puedeSegundoCC
          ? `Siguiente paso: registrar el curado (Operario de Planta). Lleva más de ${this.lote?.dias_max_para_curar} días en "Para curar": conviene un segundo control antes de curar.`
          : 'Siguiente paso: registrar el curado y envasado (Operario de Planta).';
      case 'destino': return 'El lote no es apto: falta definir su destino (venta como grano o descarte).';
      default: break;
    }
    const e = this.lote?.estado_actual;
    if (e === 'Venta como grano' || e === 'Descarte') return `Proceso finalizado: el lote quedó como "${e}".`;
    if (this.partidas.length > 0) return 'El lote ya fue curado: el seguimiento continúa en sus partidas (control final y pedidos).';
    return '';
  }

  // ---- Destino del lote no apto (modal de confirmacion) --------------------
  destinoElegido: 'Venta como grano' | 'Descarte' | null = null;
  motivoDestino = '';
  guardandoDestino = false;

  abrirDestino(destino: 'Venta como grano' | 'Descarte'): void {
    this.destinoElegido = destino;
    this.motivoDestino = '';
  }

  cancelarDestino(): void {
    this.destinoElegido = null;
  }

  confirmarDestino(): void {
    if (!this.lote?.id_lote || !this.destinoElegido) return;
    this.guardandoDestino = true;
    const elegido = this.destinoElegido;
    this.loteService.asignarDestino(this.lote.id_lote, elegido, this.motivoDestino.trim() || undefined).subscribe({
      next: () => {
        this.toastr.success(`El lote quedó como "${elegido}"`, 'Destino asignado');
        this.guardandoDestino = false;
        this.destinoElegido = null;
        this.cd.detectChanges();
        this.recargarLote();
      },
      error: (err) => {
        this.guardandoDestino = false;
        this.toastr.error(err.message, 'No se pudo asignar el destino');
        this.cd.detectChanges();
      }
    });
  }

  private recargarLote(): void {
    const id = this.lote?.id_lote;
    if (!id) return;
    this.loteService.getLote(id).subscribe((l) => { this.lote = l; this.cd.detectChanges(); });
    this.estadoService.getHistorialPorLote(id).subscribe((e) => { this.estados = e; this.cd.detectChanges(); });
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
    const externo = this.lote?.origen_semilla === 'externo';

    // Etapas del proceso, en el orden de los casos de uso. Una etapa solo cuenta como
    // hecha si todas las anteriores lo estan (asi la linea nunca muestra un salto).
    // En lotes externos no hay limpieza ni CC intermedio (CUU01 4.a, RN 8).
    const principales: { label: string; hecha: boolean; omitida?: boolean }[] = [
      { label: 'Ingreso', hecha: !!this.lote },
      { label: 'CC inicial', hecha: externo || hayControl('inicial') },
      { label: 'Limpieza', hecha: this.limpiezas.length > 0, omitida: externo },
      { label: 'CC interm.', hecha: hayControl('intermedio'), omitida: externo },
      { label: 'Curado', hecha: this.partidas.length > 0 },
      { label: 'CC final', hecha: partidaEn('Apto para comercializacion', 'Rechazado') },
      { label: 'Habilitado', hecha: partidaEn('Apto para comercializacion') },
    ];

    const terminal = ESTADOS_TERMINALES.includes(this.lote?.estado_actual as any);
    let cortado = false; // ya aparecio una etapa pendiente
    const resultado: EtapaLote[] = [];
    for (const e of principales) {
      if (e.omitida) { resultado.push({ label: e.label, estado: 'omitida' }); continue; }
      if (!cortado && e.hecha) { resultado.push({ label: e.label, estado: 'hecho' }); continue; }
      if (!cortado) { cortado = true; resultado.push({ label: e.label, estado: terminal ? 'detenida' : 'actual' }); continue; }
      resultado.push({ label: e.label, estado: 'pendiente' });
    }

    // "Est. venta" es opcional (no frena el avance): se muestra entre CC interm. y Curado.
    const estVenta: EtapaLote = { label: 'Est. venta', estado: this.estimacion ? 'hecho' : 'opcional' };
    const posCurado = resultado.findIndex((_, i) => principales[i].label === 'Curado');
    resultado.splice(posCurado, 0, estVenta);
    return resultado;
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