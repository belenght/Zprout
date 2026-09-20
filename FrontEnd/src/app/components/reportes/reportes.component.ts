import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PartidaService } from '../../services/partida.service';
import { LimpiezaService } from '../../services/limpieza.service';
import { ControlCalidadService } from '../../services/control-calidad.service';

interface BarraPorEspecie {
  nombre: string;
  tn: number;
  porcentaje: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent implements OnInit {
  volumenProcesadoTn = 0;
  mermaPromedioPct: number | null = null;
  poderGerminativoPromedio: number | null = null;
  informesGenerados = 0;

  procesadoPorEspecie: BarraPorEspecie[] = [];

  cargando = true;
  errorMessage: string | null = null;

  private cd = inject(ChangeDetectorRef);

  constructor(
    private partidaService: PartidaService,
    private limpiezaService: LimpiezaService,
    private controlCalidadService: ControlCalidadService
  ) {}

  ngOnInit(): void {
    this.cargarReportes();
  }

  private cargarReportes(): void {
    this.cargando = true;
    this.errorMessage = null;

    forkJoin({
      partidas: this.partidaService.getPartidas(),
      limpiezas: this.limpiezaService.getLimpiezas(),
      controles: this.controlCalidadService.getControles(),
    }).subscribe({
      next: ({ partidas, limpiezas, controles }) => {
        this.volumenProcesadoTn = partidas.reduce((acc, p) => acc + Number(p.volumen_en_tn), 0);

        if (limpiezas.length > 0) {
          const porcentajes = limpiezas.map((l) => {
            const merma = Number(l.merma_tn);
            const restante = Number(l.volumen_restante_tn);
            const total = merma + restante;
            return total > 0 ? (merma / total) * 100 : 0;
          });
          this.mermaPromedioPct = porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length;
        }

        if (controles.length > 0) {
          const suma = controles.reduce((acc, c) => acc + Number(c.poder_germinativo), 0);
          this.poderGerminativoPromedio = suma / controles.length;
        }

        this.informesGenerados = partidas.filter((p) => p.estado_actual === 'Apto para comercializacion').length;

        const porEspecie = new Map<string, number>();
        for (const p of partidas) {
          const nombre = (p.lote as any)?.tipo_semilla?.nombre_semilla ?? 'Sin especie';
          porEspecie.set(nombre, (porEspecie.get(nombre) ?? 0) + Number(p.volumen_en_tn));
        }
        const total = this.volumenProcesadoTn || 1;
        this.procesadoPorEspecie = Array.from(porEspecie.entries())
          .map(([nombre, tn]) => ({ nombre, tn, porcentaje: (tn / total) * 100 }))
          .sort((a, b) => b.tn - a.tn);

        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar los reportes: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }
}
