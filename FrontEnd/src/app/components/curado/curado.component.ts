import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LoteService } from '../../services/lote.service';
import { PartidaService } from '../../services/partida.service';
import { EstimacionVentaService } from '../../services/estimacion-venta.service';

interface FilaCurado {
  loteId: number;
  nro_lote: string;
  semilla_variedad: string;
  disponible_tn: number;
  estimacion_tn: number | null;
  vol_a_curar_sugerido: number;
}

/**
 * GUI-09 - "Curado y envasado" (listado). CUU05.
 */
@Component({
  selector: 'app-curado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './curado.component.html',
  styleUrl: './curado.component.css'
})
export class CuradoComponent implements OnInit {
  lotesParaCurar: FilaCurado[] = [];
  partidasEnProcesoDeEnvasado = 0;
  cargando = true;
  errorMessage: string | null = null;

  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private loteService: LoteService,
    private partidaService: PartidaService,
    private estimacionVentaService: EstimacionVentaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarListado();
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

            const estimacion = estimaciones.find((e) => (e.lote as any)?.id_lote === l.id_lote);
            const estimacionTn = estimacion ? Number(estimacion.volumen_estimado_tn) : null;

            return {
              loteId: l.id_lote!,
              nro_lote: l.nro_lote ?? `#${l.id_lote}`,
              semilla_variedad: this.nombreSemilla(l.tipo_semilla),
              disponible_tn: disponible,
              estimacion_tn: estimacionTn,
              vol_a_curar_sugerido: estimacionTn != null ? Math.min(disponible, estimacionTn) : disponible,
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
    return this.lotesParaCurar.length;
  }

  registrarCurado(fila: FilaCurado): void {
    this.router.navigate(['/curado/registrar', fila.loteId]);
  }
}
