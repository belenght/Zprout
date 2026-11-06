import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { LoteService } from '../../services/lote.service';
import { PartidaService } from '../../services/partida.service';
import { EstimacionVentaService } from '../../services/estimacion-venta.service';
import { CampanaService } from '../../services/campana.service';
import { DemandaCuradoService } from '../../services/extras.service';
import { AuthService } from '../../services/auth.service';
import { DemandaCurado } from '../../interfaces/extras';
import { exportarCsv, fechaCsv } from '../../shared/exportar-csv';

interface FilaCurado {
  loteId: number;
  nro_lote: string;
  semilla_variedad: string;
  disponible_tn: number;
  estimacion_tn: number | null;
  vol_a_curar_sugerido: number;
  falta_cc_intermedio: boolean;
  falta_cc_final: boolean;
}

/**
 * GUI-09 - "Curado y envasado" (listado). CUU05.
 */
@Component({
  selector: 'app-curado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './curado.component.html',
  styleUrl: './curado.component.css'
})
export class CuradoComponent implements OnInit {
  lotesParaCurar: FilaCurado[] = [];
  partidasEnProcesoDeEnvasado = 0;
  // Demanda insatisfecha: pedidos "Pendiente de stock" agrupados por variedad.
  demanda: DemandaCurado[] = [];
  // Carga de estimacion de venta (inline, por lote).
  loteEditando: number | null = null;
  volumenEstimado: number | null = null;
  guardandoEstimacion = false;
  cargando = true;
  errorMessage: string | null = null;

  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private loteService: LoteService,
    private partidaService: PartidaService,
    private estimacionVentaService: EstimacionVentaService,
    private router: Router,
    private demandaService: DemandaCuradoService,
    private campanaService: CampanaService,
    private toastr: ToastrService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarListado();
    // Informativo: si falla no bloquea el listado de curado.
    this.demandaService.getDemanda().subscribe({
      next: (d) => { this.demanda = d; this.cd.detectChanges(); },
      error: () => { /* la tarjeta de demanda simplemente no se muestra */ },
    });
  }

  exportarDemanda(): void {
    exportarCsv(
      'demanda-de-curado',
      ['Semilla', 'Variedad', 'Bolsas faltantes', 'Kg faltantes', 'Tn a curar', 'Tn a granel disponibles', 'Pedidos', 'Pedido más antiguo', 'Fecha requerida más próxima'],
      this.demanda.map((d) => [d.semilla, d.variedad, d.bolsas_faltantes, d.kg_faltantes, d.tn_faltantes, d.tn_a_granel_para_curar, d.pedidos.join(', '), fechaCsv(d.pedido_mas_antiguo), fechaCsv(d.fecha_requerida_mas_proxima)]),
    );
  }

  // Hay semilla a granel "Para curar" de esa variedad que alcanza para cubrir lo que falta.
  alcanzaGranel(d: DemandaCurado): boolean {
    return d.tn_a_granel_para_curar >= d.tn_faltantes;
  }

  cargarListado(): void {
    this.cargando = true;
    this.errorMessage = null;

    forkJoin({
      lotes: this.loteService.getLotes(),
      partidas: this.partidaService.getPartidas(),
      estimaciones: this.estimacionVentaService.getEstimaciones(),
    }).subscribe({
      next: ({ lotes, partidas, estimaciones }) => {
        // CUU06: partidas "Envasado" = curadas y a la espera de CC final.
        this.partidasEnProcesoDeEnvasado = partidas.filter((p) => p.estado_actual === 'Envasado').length;

        // CUU05, precondicion: el lote debe estar "Para curar".
        this.lotesParaCurar = lotes
          .filter((l) => l.estado_actual === 'Para curar')
          .map((l) => {
            // Alternativo 4.a del CUU05: disponible = volumen del lote menos
            // lo ya fraccionado en partidas previas de ese mismo lote.
            const yaCurado = partidas
              .filter((p) => (p.lote as any)?.id_lote === l.id_lote)
              .reduce((acc, p) => acc + Number(p.volumen_en_tn), 0);
            const disponible = Number(l.cantidad_semillas_en_tn) - yaCurado;

            // La estimacion mas reciente del lote (id mas alto).
            const estimacion = estimaciones
              .filter((e) => (e.lote as any)?.id_lote === l.id_lote)
              .sort((a, b) => (b.id_estimacion ?? 0) - (a.id_estimacion ?? 0))[0];
            const estimacionTn = estimacion ? Number(estimacion.volumen_estimado_tn) : null;

            return {
              loteId: l.id_lote!,
              nro_lote: l.nro_lote ?? `#${l.id_lote}`,
              semilla_variedad: this.nombreSemilla(l.tipo_semilla),
              disponible_tn: disponible,
              estimacion_tn: estimacionTn,
              vol_a_curar_sugerido: estimacionTn != null ? Math.min(disponible, estimacionTn) : disponible,
              // Lote limpio al que todavia le falta el CC intermedio apto: no se puede curar.
              falta_cc_intermedio: l.proximo_paso === 'cc_intermedio',
              // Ya tiene una partida curada esperando CC final: no se puede curar de nuevo todavia.
              falta_cc_final: l.proximo_paso === 'cc_final',
            };
          })
          .filter((f) => f.disponible_tn > 0);

        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el listado de curado: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }

  private nombreSemilla(ts: any): string {
    return ts?.nombre_semilla ? `${ts.nombre_semilla} / ${ts.variante_semilla}` : '—';
  }

  get lotesConEstimacion(): number {
    return this.lotesParaCurar.filter((f) => f.estimacion_tn != null).length;
  }

  get pendientesCurar(): number {
    return this.lotesParaCurar.filter((f) => !f.falta_cc_intermedio && !f.falta_cc_final).length;
  }

  abrirEstimacion(fila: FilaCurado): void {
    this.loteEditando = fila.loteId;
    this.volumenEstimado = fila.estimacion_tn;
  }

  cancelarEstimacion(): void {
    this.loteEditando = null;
    this.volumenEstimado = null;
  }

  guardarEstimacion(fila: FilaCurado): void {
    const vol = Number(this.volumenEstimado);
    if (!Number.isFinite(vol) || vol <= 0) {
      this.toastr.warning('Ingresá un volumen mayor a 0', 'Dato inválido');
      return;
    }
    this.guardandoEstimacion = true;
    this.campanaService.getCampanaVigente().subscribe({
      next: (campana) => {
        this.estimacionVentaService.crearEstimacion(fila.loteId, campana.id_campana, vol).subscribe({
          next: () => {
            this.guardandoEstimacion = false;
            this.toastr.success(`Estimación de ${vol} tn cargada para ${fila.nro_lote}`, 'Registrada');
            this.cancelarEstimacion();
            this.cargarListado();
          },
          error: (err) => {
            this.guardandoEstimacion = false;
            this.toastr.error(err.message, 'No se pudo cargar la estimación');
            this.cd.detectChanges();
          }
        });
      },
      error: () => {
        this.guardandoEstimacion = false;
        this.toastr.error('No hay una campaña vigente. Marcá una como vigente antes de cargar estimaciones.', 'Sin campaña');
        this.cd.detectChanges();
      }
    });
  }

  registrarCurado(fila: FilaCurado): void {
    this.router.navigate(['/curado/registrar', fila.loteId]);
  }
}