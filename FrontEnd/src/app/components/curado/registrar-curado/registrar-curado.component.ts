import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
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
const SIN_MARKUP = /^[^<>]*$/;

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
  // Solo visual (campo "Fecha del proceso" del boceto): el backend registra la fecha.
  readonly hoy = new Date();
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
  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);
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
      cantidad_existente: [null, [Validators.min(0.01)]],
      nombre_nuevo: ['', [Validators.minLength(2), Validators.maxLength(80), Validators.pattern(SIN_MARKUP)]],
      unidad_nuevo: ['', [Validators.maxLength(20), Validators.pattern(SIN_MARKUP)]],
      cantidad_nuevo: [null, [Validators.min(0.01)]],
    });
  }
  ngOnInit(): void {
    const loteId = Number(this.route.snapshot.paramMap.get('loteId'));
    this.loteService.getLote(loteId).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.cargando = false;
        this.recalcularDisponible();
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el lote: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
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
        this.cd.detectChanges();
      }
    });
    this.estimacionVentaService.getEstimaciones(loteId).subscribe({
      next: (estimaciones) => {
        const ultima = estimaciones.sort((a, b) => (a.fecha_carga! < b.fecha_carga! ? 1 : -1))[0];
        this.estimacionTn = ultima ? Number(ultima.volumen_estimado_tn) : null;
        if (this.estimacionTn != null && !this.form.value.volumen_a_curar_tn) {
          this.form.patchValue({ volumen_a_curar_tn: Math.min(this.estimacionTn, this.disponibleTn || this.estimacionTn) });
        }
        this.cd.detectChanges();
      },
      error: () => {
        // Sin estimacion cargada: el operario ingresa el volumen manualmente.
      }
    });
    this.insumoService.getInsumos().subscribe({
      next: (data) => {
        this.insumosCatalogo = data;
        this.cd.detectChanges();
      },
      error: () => {}
    });
  }
  private recalcularDisponible(): void {
    if (!this.lote || this.yaCuradoAcumulado == null) return;
    this.disponibleTn = Number(this.lote.cantidad_semillas_en_tn) - this.yaCuradoAcumulado;
  }
  // Solo visual: nombre del operario logueado (boceto: "Operario: ...").
  get operario(): string | null {
    return this.authService.getUserName();
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

  private normalizar(nombre: string): string {
    return nombre.trim().toLowerCase();
  }

  agregarInsumoExistente(): void {
    const insumoIdCtrl = this.insumoForm.get('insumo_id');
    const cantidadCtrl = this.insumoForm.get('cantidad_existente');

    if (!insumoIdCtrl?.value || cantidadCtrl?.invalid || !cantidadCtrl?.value) {
      cantidadCtrl?.markAsTouched();
      this.toastr.warning('Elegi un insumo y una cantidad valida (mayor a 0)', 'Datos incompletos');
      return;
    }

    const insumo = this.insumosCatalogo.find((i) => i.id_insumo === Number(insumoIdCtrl.value));
    if (!insumo) return;

    const cantidad = Number(cantidadCtrl.value);
    this.insumosSeleccionados.push({ insumo_id: insumo.id_insumo!, nombre_insumo: insumo.nombre_insumo, cantidad });
    this.insumoForm.patchValue({ insumo_id: null, cantidad_existente: null });
  }

  crearYAgregarInsumo(): void {
    const nombreCtrl = this.insumoForm.get('nombre_nuevo');
    const cantidadCtrl = this.insumoForm.get('cantidad_nuevo');

    if (!nombreCtrl?.value?.trim() || nombreCtrl?.invalid || cantidadCtrl?.invalid || !cantidadCtrl?.value) {
      nombreCtrl?.markAsTouched();
      cantidadCtrl?.markAsTouched();
      this.toastr.warning('El nombre debe tener entre 2 y 80 caracteres, y la cantidad debe ser mayor a 0', 'Datos incompletos');
      return;
    }

    const nombre = nombreCtrl.value.trim();
    const cantidad = Number(cantidadCtrl.value);

    // Evita duplicados por mayusculas/minusculas o espacios antes de pegarle
    // al backend: si ya existe en el catalogo cargado, se reusa ese insumo
    // en vez de crear uno nuevo.
    const existente = this.insumosCatalogo.find((i) => this.normalizar(i.nombre_insumo) === this.normalizar(nombre));
    if (existente) {
      this.toastr.info(`Ya existe el insumo "${existente.nombre_insumo}", se uso ese`, 'Insumo existente');
      this.insumosSeleccionados.push({ insumo_id: existente.id_insumo!, nombre_insumo: existente.nombre_insumo, cantidad });
      this.insumoForm.patchValue({ nombre_nuevo: '', unidad_nuevo: '', cantidad_nuevo: null });
      return;
    }

    this.insumoService.crearInsumo(nombre, this.insumoForm.value.unidad_nuevo || undefined).subscribe({
      next: (insumo) => {
        this.insumosCatalogo.push(insumo);
        this.insumosSeleccionados.push({ insumo_id: insumo.id_insumo!, nombre_insumo: insumo.nombre_insumo, cantidad });
        this.insumoForm.patchValue({ nombre_nuevo: '', unidad_nuevo: '', cantidad_nuevo: null });
        this.cd.detectChanges();
      },
      error: (err) => this.toastr.error(err.error?.error || err.message, 'No se pudo crear el insumo')
    });
  }
  quitarInsumo(index: number): void {
    this.insumosSeleccionados.splice(index, 1);
  }
  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Revisa los campos marcados en rojo antes de guardar', 'Formulario incompleto');
      return;
    }
    if (this.insumosSeleccionados.length === 0) {
      this.toastr.warning('Agrega al menos un insumo antes de confirmar', 'Falta informacion');
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
        this.cd.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.toastr.error(err.error?.error || err.message, 'Error al registrar el curado');
        this.cd.detectChanges();
      }
    });
  }
}
