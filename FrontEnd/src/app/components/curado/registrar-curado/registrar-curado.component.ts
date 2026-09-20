import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { LoteService } from '../../../services/lote.service';
import { PartidaService } from '../../../services/partida.service';
import { EstimacionVentaService } from '../../../services/estimacion-venta.service';
import { InsumoService } from '../../../services/insumo.service';
import { AuthService } from '../../../services/auth.service';
import { Lote } from '../../../interfaces/lote';
import { Partida, RegistrarCuradoPayload } from '../../../interfaces/partida';
import { Insumo } from '../../../interfaces/insumo';

const KG_POR_BOLSA = 20;

interface InsumoUtilizado {
  insumo_id: number;
  nombre_insumo: string;
  cantidad: number;
}

/**
 * GUI-10 - "Registrar curado y envasado". CUU05.
 */
@Component({
  selector: 'app-registrar-curado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registrar-curado.component.html',
  styleUrl: './registrar-curado.component.css'
})
export class RegistrarCuradoComponent implements OnInit {
  form: FormGroup;
  insumoForm: FormGroup;

  lote: Lote | null = null;
  disponibleTn = 0;
  estimacionTn: number | null = null;
  insumosCatalogo: Insumo[] = [];
  insumosSeleccionados: InsumoUtilizado[] = [];

  cargando = true;
  guardando = false;
  errorMessage: string | null = null;

  // Se completa cuando el curado se registro con exito (GUI-11, modal de
  // confirmacion) - reemplaza el formulario por el resumen del resultado.
  resultadoCurado: Partida | null = null;

  // Acumula lo ya curado del lote (suma de partidas previas) apenas llega,
  // sin importar si el lote todavia no resolvio; recalcularDisponible() lo
  // combina con lote.cantidad_semillas_en_tn en cuanto ambos esten listos.
  private yaCuradoAcumulado: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private loteService: LoteService,
    private partidaService: PartidaService,
    private estimacionVentaService: EstimacionVentaService,
    private insumoService: InsumoService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      volumen_a_curar_tn: [null, [Validators.required, Validators.min(0.01)]],
      tipo_curado: ['fungicida', Validators.required],
    });
    this.insumoForm = this.fb.group({
      insumo_id: [null],
      nombre_nuevo: [''],
      unidad_nuevo: [''],
      cantidad: [null, Validators.min(0.01)],
    });
  }

  ngOnInit(): void {
    const loteId = Number(this.route.snapshot.paramMap.get('loteId'));

    this.loteService.getLote(loteId).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.cargando = false;
        this.recalcularDisponible();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el lote: ${err.message}`;
        this.cargando = false;
      }
    });

    // Alternativo 4.a del CUU05: disponible = volumen del lote menos lo ya
    // fraccionado en partidas previas de ese mismo lote.
    this.partidaService.getPartidas().subscribe({
      next: (partidas) => {
        this.yaCuradoAcumulado = partidas
          .filter((p) => (p.lote as any)?.id_lote === loteId)
          .reduce((acc, p) => acc + Number(p.volumen_en_tn), 0);
        this.recalcularDisponible();
      }
    });

    this.estimacionVentaService.getEstimaciones(loteId).subscribe({
      next: (estimaciones) => {
        const ultima = estimaciones.sort((a, b) => (a.fecha_carga! < b.fecha_carga! ? 1 : -1))[0];
        this.estimacionTn = ultima ? Number(ultima.volumen_estimado_tn) : null;
        if (this.estimacionTn != null && !this.form.value.volumen_a_curar_tn) {
          this.form.patchValue({ volumen_a_curar_tn: Math.min(this.estimacionTn, this.disponibleTn || this.estimacionTn) });
        }
      },
      error: () => {
        // Sin estimacion cargada: el operario ingresa el volumen manualmente.
      }
    });

    this.insumoService.getInsumos().subscribe({
      next: (data) => (this.insumosCatalogo = data),
      error: () => {}
    });
  }

  private recalcularDisponible(): void {
    if (!this.lote || this.yaCuradoAcumulado == null) return;
    this.disponibleTn = Number(this.lote.cantidad_semillas_en_tn) - this.yaCuradoAcumulado;
  }

  get nombreSemilla(): string {
    const ts = this.lote?.tipo_semilla as any;
    return ts?.nombre_semilla ? `${ts.nombre_semilla} / ${ts.variante_semilla}` : '';
  }

  get cantidadBolsasCalculada(): number {
    const vol = Number(this.form.value.volumen_a_curar_tn) || 0;
    return Math.floor((vol * 1000) / KG_POR_BOLSA);
  }

  get excedeDisponible(): boolean {
    const vol = Number(this.form.value.volumen_a_curar_tn) || 0;
    return this.disponibleTn > 0 && vol > this.disponibleTn;
  }

  agregarInsumoExistente(): void {
    const insumoId = this.insumoForm.value.insumo_id;
    const cantidad = Number(this.insumoForm.value.cantidad);
    if (!insumoId || !cantidad) return;

    const insumo = this.insumosCatalogo.find((i) => i.id_insumo === Number(insumoId));
    if (!insumo) return;

    this.insumosSeleccionados.push({ insumo_id: insumo.id_insumo!, nombre_insumo: insumo.nombre_insumo, cantidad });
    this.insumoForm.patchValue({ insumo_id: null, cantidad: null });
  }

  crearYAgregarInsumo(): void {
    const nombre = this.insumoForm.value.nombre_nuevo?.trim();
    const cantidad = Number(this.insumoForm.value.cantidad);
    if (!nombre || !cantidad) return;

    this.insumoService.crearInsumo(nombre, this.insumoForm.value.unidad_nuevo || undefined).subscribe({
      next: (insumo) => {
        this.insumosCatalogo.push(insumo);
        this.insumosSeleccionados.push({ insumo_id: insumo.id_insumo!, nombre_insumo: insumo.nombre_insumo, cantidad });
        this.insumoForm.patchValue({ nombre_nuevo: '', unidad_nuevo: '', cantidad: null });
      },
      error: (err) => this.toastr.error(err.message, 'No se pudo crear el insumo')
    });
  }

  quitarInsumo(index: number): void {
    this.insumosSeleccionados.splice(index, 1);
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.lote?.id_lote) return;

    const valores = this.form.value;
    const payload: RegistrarCuradoPayload = {
      lote_id: this.lote.id_lote,
      volumen_a_curar_tn: valores.volumen_a_curar_tn,
      tipo_curado: valores.tipo_curado,
      insumos: this.insumosSeleccionados.map((i) => ({ insumo_id: i.insumo_id, cantidad: i.cantidad })),
    };

    this.guardando = true;
    this.partidaService.registrarCurado(payload).subscribe({
      next: (partida) => {
        this.guardando = false;
        this.resultadoCurado = partida;
        this.toastr.success('Curado y envasado registrado con exito', 'Registrado');
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.toastr.error(err.error?.error || err.message, 'Error al registrar el curado');
      }
    });
  }
}
