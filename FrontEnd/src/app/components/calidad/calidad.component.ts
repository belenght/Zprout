import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LoteService } from '../../services/lote.service';
import { PartidaService } from '../../services/partida.service';

type EtapaControl = 'CC inicial' | 'CC intermedio' | 'CC final';

interface ItemBandejaCalidad {
  tipo: 'lote' | 'partida';
  id: number;
  codigo: string;
  semilla_variedad: string;
  etapa: EtapaControl;
  estado_actual: string | null;
}

@Component({
  selector: 'app-calidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calidad.component.html',
  styleUrl: './calidad.component.css'
})
export class CalidadComponent implements OnInit {
  items: ItemBandejaCalidad[] = [];
  cargando = true;
  errorMessage: string | null = null;

  constructor(
    private loteService: LoteService,
    private partidaService: PartidaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarBandeja();
  }

  cargarBandeja(): void {
    this.cargando = true;
    this.errorMessage = null;

    forkJoin({
      lotes: this.loteService.getLotes(),
      partidas: this.partidaService.getPartidas(),
    }).subscribe({
      next: ({ lotes, partidas }) => {
        // CUU02, paso 1: lotes en "Pendiente CC" (CC inicial) o "En limpieza"
        // (CC intermedio, ver CRE paso 4) esperando inspeccion.
        const itemsLotes: ItemBandejaCalidad[] = lotes
          .filter((l) => l.estado_actual === 'Pendiente CC' || l.estado_actual === 'En limpieza')
          .map((l) => ({
            tipo: 'lote' as const,
            id: l.id_lote!,
            codigo: l.nro_lote ?? `#${l.id_lote}`,
            semilla_variedad: this.nombreSemilla(l.tipo_semilla),
            etapa: (l.estado_actual === 'Pendiente CC' ? 'CC inicial' : 'CC intermedio') as EtapaControl,
            estado_actual: l.estado_actual ?? null,
          }));

        // CUU06: partidas en "Envasado" esperando control final + Informe de Partida.
        const itemsPartidas: ItemBandejaCalidad[] = partidas
          .filter((p) => p.estado_actual === 'Envasado')
          .map((p) => ({
            tipo: 'partida' as const,
            id: p.id_partida,
            codigo: p.nro_partida,
            semilla_variedad: this.nombreSemilla((p.lote as any)?.tipo_semilla),
            etapa: 'CC final' as EtapaControl,
            estado_actual: p.estado_actual ?? null,
          }));

        this.items = [...itemsLotes, ...itemsPartidas];
        this.cargando = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar la bandeja de calidad: ${err.message}`;
        this.cargando = false;
      }
    });
  }

  private nombreSemilla(ts: any): string {
    return ts?.nombre_semilla ? `${ts.nombre_semilla} / ${ts.variante_semilla}` : '—';
  }

  get pendientesInicial(): number {
    return this.items.filter((i) => i.etapa === 'CC inicial').length;
  }

  get pendientesIntermedio(): number {
    return this.items.filter((i) => i.etapa === 'CC intermedio').length;
  }

  get pendientesFinal(): number {
    return this.items.filter((i) => i.etapa === 'CC final').length;
  }

  controlar(item: ItemBandejaCalidad): void {
    if (item.tipo === 'partida') {
      // CUU06: control final se registra sobre la Partida, en el modulo Curado/Partidas.
      this.router.navigate(['/curado/control-final', item.id]);
      return;
    }
    const tipo = item.etapa === 'CC inicial' ? 'inicial' : 'intermedio';
    this.router.navigate(['/calidad/registrar', item.id], { queryParams: { tipo } });
  }
}
