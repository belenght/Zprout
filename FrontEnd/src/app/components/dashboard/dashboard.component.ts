import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { AlertaService } from '../../services/extras.service';
import { Alerta } from '../../interfaces/extras';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoteService } from '../../services/lote.service';
import { AuthService } from '../../services/auth.service';
import { PartidaService } from '../../services/partida.service';
import { ControlCalidadService } from '../../services/control-calidad.service';
import { CampanaService } from '../../services/campana.service';
import { Lote } from '../../interfaces/lote';
import { Partida } from '../../interfaces/partida';
import { ControlDeCalidad } from '../../interfaces/control-calidad';
import { claseBadgeEstadoSolido } from '../../shared/estado-badge';

// Evento interno para armar el panel "Actividad reciente". `soloFecha` es true
// cuando el dato del backend no trae hora (Lote.fecha_ingreso, Partida.fecha_*
// son de tipo `date`); en ese caso se muestra "Hoy" / "Ayer" / fecha.
interface EventoActividad {
  momento: Date;
  soloFecha: boolean;
  texto: string;
}

export interface ItemActividad {
  hora: string;
  texto: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  nombreUsuario = '';
  ultimosLotes: Lote[] = [];
  cantidadLotesActivos = 0;
  cargando = true;
  errorMessage: string | null = null;

  // Nombre de la campaña vigente (ej: "2025/2026"); null si no hay o no se pudo cargar.
  campanaVigente: string | null = null;
  actividad: ItemActividad[] = [];

  // Datos crudos para los indicadores y la actividad reciente. null = todavia
  // no llegaron (o la carga fallo): el indicador correspondiente muestra "—".
  private lotes: Lote[] | null = null;
  private partidas: Partida[] | null = null;
  private controles: ControlDeCalidad[] | null = null;

  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private loteService: LoteService,
    private authService: AuthService,
    private partidaService: PartidaService,
    private controlCalidadService: ControlCalidadService,
    private campanaService: CampanaService,
    private alertaService: AlertaService
  ) {}

  // Alertas operativas (lotes demorados, pedidos sin stock, almacenes llenos...).
  alertas: Alerta[] = [];
  alertasCargadas = false;

  claseAlerta(a: Alerta): string {
    return a.severidad === 'alta' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900';
  }

  claseBadgeEstadoSolido = claseBadgeEstadoSolido;

  ngOnInit(): void {
    this.nombreUsuario = this.authService.getUserName() ?? '';
    this.cargarIndicadores();
  }

  cargarIndicadores(): void {
    this.cargando = true;
    this.loteService.getLotes().subscribe({
      next: (lotes) => {
        this.lotes = lotes;
        this.cantidadLotesActivos = lotes.length;
        this.ultimosLotes = lotes.slice(0, 5);
        this.cargando = false;
        this.errorMessage = null;
        this.recalcularActividad();
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el dashboard: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });

    // Los datos siguientes son informativos: si alguno falla, solo se
    // queda en "—" su indicador y el resto del dashboard sigue funcionando.
    this.partidaService.getPartidas().subscribe({
      next: (partidas) => {
        this.partidas = partidas;
        this.recalcularActividad();
        this.cd.detectChanges();
      },
      error: () => {}
    });

    this.controlCalidadService.getControles().subscribe({
      next: (controles) => {
        this.controles = controles;
        this.recalcularActividad();
        this.cd.detectChanges();
      },
      error: () => {}
    });

    this.alertaService.getAlertas().subscribe({
      next: (r) => {
        this.alertas = r.alertas;
        this.alertasCargadas = true;
        this.cd.detectChanges();
      },
      error: () => {}
    });

    // 404 = no hay campaña vigente configurada: el saludo simplemente no la muestra.
    this.campanaService.getCampanaVigente().subscribe({
      next: (campana) => {
        this.campanaVigente = campana?.nombre ?? null;
        this.cd.detectChanges();
      },
      error: () => {}
    });
  }

  // ---- Indicadores (mismas definiciones que usan Calidad y Curado) ---------

  // Igual que la bandeja de Calidad: lotes esperando CC inicial/intermedio
  // (inicial en "Pendiente CC"; intermedio en lotes limpios) + partidas "Envasado" esperando CC final.
  get pendientesCC(): number | null {
    if (!this.lotes || !this.partidas) return null;
    const lotes = this.lotes.filter(
      (l) => l.proximo_paso === 'cc_inicial' || l.proximo_paso === 'cc_intermedio'
    ).length;
    const partidas = this.partidas.filter((p) => p.estado_actual === 'Envasado').length;
    return lotes + partidas;
  }

  // Toneladas de lotes en estado "Para curar" (listos para registrar curado).
  get paraCurarTn(): number | null {
    if (!this.lotes) return null;
    return this.lotes
      .filter((l) => l.estado_actual === 'Para curar')
      .reduce((suma, l) => suma + (Number(l.cantidad_semillas_en_tn) || 0), 0);
  }

  // Toneladas de partidas ya habilitadas para venta ("Apto para comercializacion").
  get stockCuradoTn(): number | null {
    if (!this.partidas) return null;
    return this.partidas
      .filter((p) => p.estado_actual === 'Apto para comercializacion')
      .reduce((suma, p) => suma + (Number(p.volumen_en_tn) || 0), 0);
  }

  // ---- Tabla "Ultimos lotes ingresados" -------------------------------------

  semilla(lote: Lote): string {
    return (lote.tipo_semilla as any)?.nombre_semilla ?? '—';
  }

  variedad(lote: Lote): string {
    return (lote.tipo_semilla as any)?.variante_semilla ?? '—';
  }

  // ---- Actividad reciente ---------------------------------------------------
  // No hay un endpoint de actividad: se arma en el front con lo que ya se
  // consulta (ingresos de lotes, controles de calidad y partidas).

  private recalcularActividad(): void {
    const eventos: EventoActividad[] = [];

    for (const l of this.lotes ?? []) {
      if (!l.fecha_ingreso) continue;
      eventos.push(
        this.evento(l.fecha_ingreso, true, `Nuevo lote ingresado · ${l.nro_lote ?? '#' + l.id_lote}`)
      );
    }

    for (const c of this.controles ?? []) {
      if (!c.fecha) continue;
      const referencia =
        c.tipo_control === 'final' ? (c.partida as any)?.nro_partida : (c.lote as any)?.nro_lote;
      if (!referencia) continue;
      const resultado = c.resultado ? (c.resultado === 'Apto' ? 'aprobado' : 'no apto') : 'registrado';
      eventos.push(this.evento(c.fecha, false, `CC ${c.tipo_control} ${resultado} · ${referencia}`));
    }

    for (const p of this.partidas ?? []) {
      const lote = (p.lote as any)?.nro_lote ?? p.nro_partida;
      if (p.fecha_curado) {
        eventos.push(this.evento(p.fecha_curado, true, `Curado completado · ${lote}`));
      }
      if (p.fecha_envasado && p.estado_actual === 'Apto para comercializacion') {
        eventos.push(this.evento(p.fecha_envasado, true, `Informe generado · ${p.nro_partida}`));
      }
    }

    this.actividad = eventos
      .filter((e) => !isNaN(e.momento.getTime()))
      .sort((a, b) => b.momento.getTime() - a.momento.getTime())
      .slice(0, 5)
      .map((e) => ({ hora: this.etiquetaMomento(e), texto: e.texto }));
  }

  private evento(valor: string, soloFecha: boolean, texto: string): EventoActividad {
    const d = new Date(valor);
    // Una fecha sin hora llega como medianoche UTC: se rearma con el dia
    // calendario correcto para no mostrar "ayer" por el huso horario.
    const momento = soloFecha ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d;
    return { momento, soloFecha, texto };
  }

  private etiquetaMomento(e: EventoActividad): string {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    const dia = new Date(e.momento.getFullYear(), e.momento.getMonth(), e.momento.getDate()).getTime();
    const dias = Math.round((hoy - dia) / 86_400_000);

    if (dias === 0) {
      return e.soloFecha
        ? 'Hoy'
        : e.momento.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (dias === 1) return 'Ayer';
    return e.momento.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
}
