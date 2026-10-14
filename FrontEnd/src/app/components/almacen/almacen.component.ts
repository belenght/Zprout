import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { AlmacenService } from '../../services/almacen.service';
import { LoteService } from '../../services/lote.service';
import { PartidaService } from '../../services/partida.service';
import { Almacen, TipoAlmacen } from '../../interfaces/almacen';
import { AuthService } from '../../services/auth.service';
import { exportarCsv } from '../../shared/exportar-csv';

interface StockVariedad {
  tipoSemillaId: number;
  semilla: string;
  variedad: string;
  aGranelTn: number; // disponible: lo que todavia no se curo
  aGranelTotalTn: number; // total ingresado en lotes a granel
  envasadoBolsas: number; // bolsas disponibles (aptas menos las asignadas a pedidos)
  envasadoAptasBolsas: number; // bolsas aptas en total
  comprometidasBolsas: number; // asignadas a pedidos
  estado: 'Disponible' | 'Stock bajo' | 'Sin stock';
}

const ESTADOS_LOTE_A_GRANEL = ['Pendiente CC', 'En limpieza', 'Para curar'];

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

  auth = inject(AuthService);
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

        const aGranel = new Map<number, { semilla: string; variedad: string; tn: number; total: number }>();
        for (const l of lotes) {
          if (!ESTADOS_LOTE_A_GRANEL.includes(l.estado_actual ?? '')) continue;
          const ts = l.tipo_semilla as any;
          if (!ts?.id_semilla) continue;
          const acc = aGranel.get(ts.id_semilla) ?? { semilla: ts.nombre_semilla, variedad: ts.variante_semilla, tn: 0, total: 0 };
          // Disponible = total del lote menos lo ya curado en partidas (lo calcula el backend).
          acc.tn += Number(l.volumen_disponible_tn ?? l.cantidad_semillas_en_tn);
          acc.total += Number(l.cantidad_semillas_en_tn);
          aGranel.set(ts.id_semilla, acc);
        }

        const envasado = new Map<number, { semilla: string; variedad: string; bolsas: number; aptas: number; comprometidas: number }>();
        for (const p of partidas) {
          if (p.estado_actual !== 'Apto para comercializacion') continue;
          const ts = (p.lote as any)?.tipo_semilla;
          if (!ts?.id_semilla) continue;
          const acc = envasado.get(ts.id_semilla) ?? { semilla: ts.nombre_semilla, variedad: ts.variante_semilla, bolsas: 0, aptas: 0, comprometidas: 0 };
          acc.aptas += p.cantidad_bolsas_20kg ?? 0;
          acc.comprometidas += p.bolsas_comprometidas ?? 0;
          acc.bolsas += p.bolsas_disponibles ?? p.cantidad_bolsas_20kg ?? 0;
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
            aGranelTotalTn: g?.total ?? 0,
            envasadoBolsas,
            envasadoAptasBolsas: e?.aptas ?? 0,
            comprometidasBolsas: e?.comprometidas ?? 0,
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

  // Solo visual: nombre con tilde y color del numero segun el tipo de unidad.
  nombreTipo(a: Almacen): string {
    const nombres: Record<string, string> = { silo: 'Silo', galpon: 'Galpón', deposito: 'Depósito' };
    return nombres[a.tipo] ?? a.tipo;
  }

  claseNumeroTipo(a: Almacen): string {
    const clases: Record<string, string> = {
      silo: 'text-brand-700',
      galpon: 'text-[#8a5a0b]',
      deposito: 'text-[#1d4e89]',
    };
    return clases[a.tipo] ?? 'text-brand-700';
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

  exportarStock(): void {
    exportarCsv(
      'stock-por-variedad',
      ['Semilla', 'Variedad', 'A granel disponible (tn)', 'A granel total (tn)', 'Envasado disponible (bolsas)', 'Envasado apto (bolsas)', 'En pedidos (bolsas)', 'Estado'],
      this.stockPorVariedad.map((s) => [s.semilla, s.variedad, s.aGranelTn, s.aGranelTotalTn, s.envasadoBolsas, s.envasadoAptasBolsas, s.comprometidasBolsas, s.estado]),
    );
  }
}