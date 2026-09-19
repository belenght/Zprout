import { Component, OnInit } from '@angular/core';
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
      },
      error: (err) => {
        this.errorMessage = `Error al cargar los lotes: ${err.message}`;
        this.cargando = false;
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