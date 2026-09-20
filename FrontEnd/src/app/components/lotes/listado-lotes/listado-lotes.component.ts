import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoteService } from '../../../services/lote.service';
import { Lote } from '../../../interfaces/lote';
import { claseBadgeEstado } from '../../../shared/estado-badge';
import { ESTADOS_LOTE } from '../../../shared/estado-nombres';

@Component({
  selector: 'app-listado-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './listado-lotes.component.html',
  styleUrl: './listado-lotes.component.css'
})
export class ListadoLotesComponent implements OnInit {
  lotes: Lote[] = [];
  cargando = true;
  errorMessage: string | null = null;

  // Filtros: solo en el front, sobre los datos ya traidos (no pega de nuevo
  // al backend). Vocabulario de estados = ESTADOS_LOTE, el mismo que usa
  // el backend (ver estado_nombres.ts) para no inventar sinonimos.
  busqueda = '';
  estadoFiltro: string | null = null;
  readonly estadosDisponibles = ESTADOS_LOTE;
  claseBadgeEstado = claseBadgeEstado;

  // Fuerza el redibujado justo despues de que el subscribe actualiza el
  // estado del componente. En algunos entornos (ciertas extensiones de
  // browser que interfieren con el parcheo de zone.js sobre XHR/fetch) la
  // respuesta HTTP puede resolver fuera de la deteccion de cambios
  // automatica de Angular, y la vista se queda vieja hasta que otra
  // interaccion la refresca "de arrastre". detectChanges() no depende de
  // zonas, redibuja este componente ahi mismo.
  private cd = inject(ChangeDetectorRef);

  constructor(private loteService: LoteService) {}

  ngOnInit(): void {
    this.getLotes();
  }

  getLotes(): void {
    this.cargando = true;
    this.loteService.getLotes().subscribe({
      next: (data) => {
        this.lotes = data;
        this.cargando = false;
        this.errorMessage = null;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar los lotes: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }

  get lotesFiltrados(): Lote[] {
    const texto = this.busqueda.trim().toLowerCase();
    return this.lotes.filter((lote) => {
      if (this.estadoFiltro && lote.estado_actual !== this.estadoFiltro) {
        return false;
      }
      if (!texto) return true;
      const ts = lote.tipo_semilla as any;
      const campos = [lote.nro_lote, ts?.nombre_semilla, ts?.variante_semilla]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return campos.some((v) => v.includes(texto));
    });
  }

  setFiltroEstado(estado: string | null): void {
    this.estadoFiltro = estado;
  }
}