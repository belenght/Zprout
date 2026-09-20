import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { AlmacenService } from '../../services/almacen.service';
import { LoteService } from '../../services/lote.service';
import { PartidaService } from '../../services/partida.service';
import { Almacen, TipoAlmacen } from '../../interfaces/almacen';

interface StockVariedad {
  tipoSemillaId: number;
  semilla: string;
  variedad: string;
  aGranelTn: number;
  envasadoBolsas: number;
  estado: 'Disponible' | 'Stock bajo' | 'Sin stock';
}

// Estados de Lote que representan grano todavia sin procesar/empaquetar
// (ver BackEnd/src/estado/estado_nombres.ts). Los terminales (No apto,
// Venta como grano, Descarte) ya salieron del circuito y no cuentan como
// stock disponible.
const ESTADOS_LOTE_A_GRANEL = ['Pendiente CC', 'En limpieza', 'Para curar'];

/**
 * GUI-15 - "Almacén": vista de solo lectura sobre el stock que ya gestionan
 * Lotes/Curado/CC final, mas el ABM de las unidades fisicas (silos, galpones,
 * depositos). No tiene CUU propio en la documentacion.
 */
@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './almacen.component.html',
  styleUrl: './almacen.component.css'
})
export class AlmacenComponent implements OnInit {
  almacenes: Almacen[] = [];
  stockPorVariedad: StockVariedad[] = [];
  cargando = true;
  errorMessage: string | null = null;

  form: FormGroup;
  editandoId: number | null = null;

  private cd = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private almacenService: AlmacenService,
    private loteService: LoteService,
    private partidaService: PartidaService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      tipo: ['silo' as TipoAlmacen, Validators.required],
      capacidad: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.cargando = true;
    this.errorMessage = null;

    forkJoin({
      almacenes: this.almacenService.getAlmacenes(),
      lotes: this.loteService.getLotes(),
      partidas: this.partidaService.getPartidas(),
    }).subscribe({
      next: ({ almacenes, lotes, partidas }) => {
        this.almacenes = almacenes;

        // "A granel": Lotes que todavia no se envasaron, agrupados por tipo de semilla.
        const aGranel = new Map<number, { semilla: string; variedad: string; tn: number }>();
        for (const l of lotes) {
          if (!ESTADOS_LOTE_A_GRANEL.includes(l.estado_actual ?? '')) continue;
          const ts = l.tipo_semilla as any;
          if (!ts?.id_semilla) continue;
          const acc = aGranel.get(ts.id_semilla) ?? { semilla: ts.nombre_semilla, variedad: ts.variante_semilla, tn: 0 };
          acc.tn += Number(l.cantidad_semillas_en_tn);
          aGranel.set(ts.id_semilla, acc);
        }

        // "Envasado": Partidas aptas para comercializar, agrupadas por tipo de semilla.
        const envasado = new Map<number, { semilla: string; variedad: string; bolsas: number }>();
        for (const p of partidas) {
          if (p.estado_actual !== 'Apto para comercializacion') continue;
          const ts = (p.lote as any)?.tipo_semilla;
          if (!ts?.id_semilla) continue;
          const acc = envasado.get(ts.id_semilla) ?? { semilla: ts.nombre_semilla, variedad: ts.variante_semilla, bolsas: 0 };
          acc.bolsas += p.cantidad_bolsas_20kg ?? 0;
          envasado.set(ts.id_semilla, acc);
        }

        const idsTipoSemilla = new Set([...aGranel.keys(), ...envasado.keys()]);
        this.stockPorVariedad = Array.from(idsTipoSemilla).map((id) => {
          const g = aGranel.get(id);
          const e = envasado.get(id);
          const aGranelTn = g?.tn ?? 0;
          const envasadoBolsas = e?.bolsas ?? 0;
          return {
            tipoSemillaId: id,
            semilla: g?.semilla ?? e?.semilla ?? '',
            variedad: g?.variedad ?? e?.variedad ?? '',
            aGranelTn,
            envasadoBolsas,
            estado: envasadoBolsas > 0 ? 'Disponible' : aGranelTn > 0 ? 'Stock bajo' : 'Sin stock',
          };
        });

        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el almacen: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }

  porcentajeOcupado(a: Almacen): number {
    const cap = Number(a.capacidad);
    if (!cap) return 0;
    return Math.min(100, ((a.ocupado_tn ?? 0) / cap) * 100);
  }

  editar(a: Almacen): void {
    this.editandoId = a.id_almacen;
    this.form.patchValue({ tipo: a.tipo, capacidad: Number(a.capacidad) });
  }

  cancelarEdicion(): void {
    this.editandoId = null;
    this.form.reset({ tipo: 'silo', capacidad: null });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valores = this.form.value;
    const idEditando = this.editandoId;

    const obs = idEditando
      ? this.almacenService.actualizarAlmacen(idEditando, valores)
      : this.almacenService.crearAlmacen(valores);

    obs.subscribe({
      next: (resultado) => {
        if (idEditando) {
          this.almacenes = this.almacenes.map((a) => (a.id_almacen === idEditando ? resultado : a));
        } else {
          this.almacenes = [...this.almacenes, resultado];
        }
        this.toastr.success('Almacen guardado', 'Listo');
        this.cancelarEdicion();
        this.cd.detectChanges();
      },
      error: (err) => {
        this.toastr.error(err.message, 'Error al guardar');
        this.cd.detectChanges();
      }
    });
  }

  eliminar(a: Almacen): void {
    if (!confirm(`¿Eliminar el ${a.tipo} #${a.id_almacen}?`)) return;
    this.almacenService.eliminarAlmacen(a.id_almacen).subscribe({
      next: () => {
        this.almacenes = this.almacenes.filter((x) => x.id_almacen !== a.id_almacen);
        this.toastr.success('Almacen eliminado', 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.toastr.error(err.message, 'Error al eliminar');
        this.cd.detectChanges();
      }
    });
  }
}
