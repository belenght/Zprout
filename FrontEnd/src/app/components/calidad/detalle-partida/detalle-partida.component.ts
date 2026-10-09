import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { PartidaService } from '../../../services/partida.service';
import { ControlCalidadService } from '../../../services/control-calidad.service';
import { PedidoService } from '../../../services/pedido.service';
import { Partida } from '../../../interfaces/partida';
import { ControlDeCalidad } from '../../../interfaces/control-calidad';
import { Pedido } from '../../../interfaces/pedido';
import { claseBadgeEstadoSolido } from '../../../shared/estado-badge';

interface PedidoConsumidor {
  pedido: Pedido;
  bolsas: number;
}

/**
 * GUI-19 - "Detalle de partida" (trazabilidad). Solo lectura: junta datos que
 * ya expone el backend (partida, control final y pedidos con partida asignada).
 */
@Component({
  selector: 'app-detalle-partida',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './detalle-partida.component.html',
  styleUrl: './detalle-partida.component.css'
})
export class DetallePartidaComponent implements OnInit {
  partida: Partida | null = null;
  controlFinal: ControlDeCalidad | null = null;
  pedidosConsumidores: PedidoConsumidor[] = [];
  cargando = true;
  errorMessage: string | null = null;

  claseBadgeEstadoSolido = claseBadgeEstadoSolido;

  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private route: ActivatedRoute,
    private partidaService: PartidaService,
    private controlCalidadService: ControlCalidadService,
    private pedidoService: PedidoService
  ) {}

  ngOnInit(): void {
    const partidaId = Number(this.route.snapshot.paramMap.get('partidaId'));

    this.partidaService.getPartida(partidaId).subscribe({
      next: (partida) => {
        this.partida = partida;
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar la partida: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });

    // Resultado del CC final: el control mas reciente de tipo "final" de esta partida.
    this.controlCalidadService.getControles().subscribe({
      next: (controles) => {
        this.controlFinal =
          controles.find((c) => c.tipo_control === 'final' && this.idPartidaDe(c.partida) === partidaId) ?? null;
        this.cd.detectChanges();
      },
      error: () => {
        // Informativo: si falla no bloquea el resto de la pantalla.
      }
    });

    // Pedidos que consumen la partida: solo los "Aprobado para despacho" o
    // "Despachado" tienen partida asignada (un pendiente todavia no, y solo
    // un pendiente se puede cancelar).
    this.pedidoService.getPedidos().subscribe({
      next: (pedidos) => {
        const conAsignacion = pedidos.filter(
          (p) => p.estado_pedido === 'Aprobado para despacho' || p.estado_pedido === 'Despachado'
        );
        const consultas = conAsignacion.length
          ? forkJoin(conAsignacion.map((p) => this.pedidoService.getPedido(p.id_pedido)))
          : of([]);
        consultas.subscribe({
          next: (detalles) => {
            this.pedidosConsumidores = detalles
              .map((d) => ({
                pedido: d.pedido,
                bolsas: d.detalle
                  .filter((x) => this.idPartidaDe(x.partida_asignada) === partidaId)
                  .reduce((acc, x) => acc + (x.cantidad_asignada_bolsas ?? 0), 0),
              }))
              .filter((x) => x.bolsas > 0);
            this.cd.detectChanges();
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  private idPartidaDe(p: unknown): number | null {
    if (p == null) return null;
    return typeof p === 'number' ? p : (p as Partida).id_partida ?? null;
  }

  get nroLote(): string {
    return (this.partida?.lote as any)?.nro_lote ?? '';
  }

  get loteId(): number | null {
    return (this.partida?.lote as any)?.id_lote ?? null;
  }

  get bolsasTotales(): number {
    return this.partida?.cantidad_bolsas_20kg ?? 0;
  }

  get bolsasComprometidas(): number {
    return this.pedidosConsumidores.reduce((acc, x) => acc + x.bolsas, 0);
  }

  get bolsasDisponibles(): number {
    return this.bolsasTotales - this.bolsasComprometidas;
  }

  get humedad(): number | null {
    return this.controlFinal ? Number(this.controlFinal.humedad) : null;
  }

  get pureza(): number | null {
    return this.controlFinal ? Number(this.controlFinal.nivel_de_pureza) : null;
  }

  get poderGerminativo(): number | null {
    return this.controlFinal ? Number(this.controlFinal.poder_germinativo) : null;
  }
}
