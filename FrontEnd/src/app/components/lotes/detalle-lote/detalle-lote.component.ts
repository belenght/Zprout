import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LoteService } from '../../../services/lote.service';
import { Lote } from '../../../interfaces/lote';
import { claseBadgeEstado } from '../../../shared/estado-badge';

@Component({
  selector: 'app-detalle-lote',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-lote.component.html',
  styleUrl: './detalle-lote.component.css'
})
export class DetalleLoteComponent implements OnInit {
  lote: Lote | null = null;
  cargando = true;
  errorMessage: string | null = null;

  constructor(private route: ActivatedRoute, private loteService: LoteService) {}

  claseBadgeEstado = claseBadgeEstado;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loteService.getLote(id).subscribe({
      next: (data) => {
        this.lote = data;
        this.cargando = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el lote: ${err.message}`;
        this.cargando = false;
      }
    });
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