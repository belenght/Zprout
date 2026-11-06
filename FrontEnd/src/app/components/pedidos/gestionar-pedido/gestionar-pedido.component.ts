import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormArray, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PedidoService } from '../../../services/pedido.service';
import { PartidaService } from '../../../services/partida.service';
import { TipoSemillaService } from '../../../services/tipo-semilla.service';
import { TipoDeSemilla } from '../../../interfaces/catalogos';
import { GestionarPedidoPayload, ResultadoGestionarPedido, TipoPedido } from '../../../interfaces/pedido';

// Tope por item (tn): evita cargar cantidades absurdas por error de tipeo. Mismo valor en el backend.
export const MAX_TN_POR_ITEM = 1000;

// La fecha requerida de entrega no puede ser anterior a hoy.
function fechaNoPasada(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (!v) return null;
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return String(v) < hoyStr ? { fechaPasada: true } : null;
}

/**
 * GUI-17 - "Gestionar pedido" (Nuevo pedido) + GUI-18 (confirmacion). CUU07.
 */
@Component({
  selector: 'app-gestionar-pedido',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './gestionar-pedido.component.html',
  styleUrl: './gestionar-pedido.component.css'
})
export class GestionarPedidoComponent implements OnInit {
  form: FormGroup;
  tiposSemilla: TipoDeSemilla[] = [];
  readonly maxTn = MAX_TN_POR_ITEM;
  // Fecha minima del selector (hoy, en horario local).
  readonly hoyIso = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

  // Kg aptos "para comercializacion" por tipo_semilla_id. Aproximado: suma
  // el stock de partidas ya envasadas y con CC final aprobado, SIN restar lo
  // que ya este comprometido en otros pedidos (esa cuenta exacta la hace el
  // backend via stockDisponiblePorVariedad al confirmar). Sirve como
  // indicador visual (GUI-17: columna "Stock apto"), no como validacion
  // definitiva.
  stockAptoKgPorTipo = new Map<number, number>();

  cargando = true;
  guardando = false;
  errorMessage: string | null = null;
  resultado: ResultadoGestionarPedido | null = null;

  private cd = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private pedidoService: PedidoService,
    private partidaService: PartidaService,
    private tipoSemillaService: TipoSemillaService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      comprador: ['', Validators.required],
      fecha_requerida: ['', [Validators.required, fechaNoPasada]],
      tipo: ['hibrida' as TipoPedido, Validators.required],
      items: this.fb.array([this.crearItem()]),
    });
  }

  ngOnInit(): void {
    this.tipoSemillaService.getTiposSemilla().subscribe({
      next: (data) => {
        this.tiposSemilla = data;
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar los tipos de semilla: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });

    this.partidaService.getPartidas().subscribe({
      next: (partidas) => {
        const mapa = new Map<number, number>();
        for (const p of partidas) {
          if (p.estado_actual !== 'Apto para comercializacion') continue;
          const tipoId = (p.lote as any)?.tipo_semilla?.id_semilla;
          if (!tipoId) continue;
          const kg = (p.cantidad_bolsas_20kg ?? 0) * 20;
          mapa.set(tipoId, (mapa.get(tipoId) ?? 0) + kg);
        }
        this.stockAptoKgPorTipo = mapa;
        this.cd.detectChanges();
      },
      error: () => {
        // El indicador de stock es informativo; si falla no bloquea el formulario.
      }
    });
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private crearItem(): FormGroup {
    return this.fb.group({
      tipo_semilla_id: [null, Validators.required],
      cantidad_tn: [null, [Validators.required, Validators.min(0.01), Validators.max(MAX_TN_POR_ITEM)]],
    });
  }

  agregarItem(): void {
    this.items.push(this.crearItem());
  }

  quitarItem(index: number): void {
    if (this.items.length === 1) return;
    this.items.removeAt(index);
  }

  nombreSemilla(tipoId: number | null): string {
    const t = this.tiposSemilla.find((x) => x.id_semilla === tipoId);
    return t ? `${t.nombre_semilla} / ${t.variante_semilla}` : '';
  }

  stockAptoTn(tipoId: number | null): number {
    if (!tipoId) return 0;
    return (this.stockAptoKgPorTipo.get(tipoId) ?? 0) / 1000;
  }

  itemConStockBajo(tipoId: number | null, cantidadTn: number | null): boolean {
    if (!tipoId || !cantidadTn) return false;
    return this.stockAptoTn(tipoId) < cantidadTn;
  }

  get algunItemConStockBajo(): boolean {
    return this.items.controls.some((c) =>
      this.itemConStockBajo(c.get('tipo_semilla_id')?.value, c.get('cantidad_tn')?.value)
    );
  }

  // Solo visual: nombres de los items con stock bajo para el aviso lateral.
  get nombresItemsConStockBajo(): string {
    const nombres = this.items.controls
      .filter((c) => this.itemConStockBajo(c.get('tipo_semilla_id')?.value, c.get('cantidad_tn')?.value))
      .map((c) => this.nombreSemilla(c.get('tipo_semilla_id')?.value));
    return nombres.join(', ');
  }

  confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.value;
    const payload: GestionarPedidoPayload = {
      comprador: valores.comprador,
      fecha_requerida: valores.fecha_requerida,
      tipo: valores.tipo,
      items: valores.items.map((i: any) => ({
        tipo_semilla_id: i.tipo_semilla_id,
        cantidad_solicitada_kg: i.cantidad_tn * 1000,
      })),
    };

    this.guardando = true;
    this.pedidoService.gestionarPedido(payload).subscribe({
      next: (resultado) => {
        this.guardando = false;
        this.resultado = resultado;
        if (resultado.stock_pendiente) {
          this.toastr.warning('El pedido quedo "Pendiente de stock"', 'Registrado');
        } else {
          this.toastr.success('Pedido aprobado para despacho', 'Registrado');
        }
        this.cd.detectChanges();
      },
      error: (err) => {
        this.guardando = false;
        this.toastr.error(err.message, 'Error al registrar el pedido');
        this.cd.detectChanges();
      }
    });
  }
}
