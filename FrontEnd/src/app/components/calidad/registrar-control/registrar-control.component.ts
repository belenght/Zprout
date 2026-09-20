import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { LoteService } from '../../../services/lote.service';
import { ControlCalidadService } from '../../../services/control-calidad.service';
import { Lote } from '../../../interfaces/lote';
import { ControlDeCalidad, RangosFueraDeRango, RegistrarControlLotePayload } from '../../../interfaces/control-calidad';
import { claseBadgeEstado } from '../../../shared/estado-badge';

/**
 * GUI-07 - "Registrar CC (Inicial / Intermedio)"
 * CUU02 - "Registrar Control de Calidad", aplicado sobre Lote.
 */
@Component({
  selector: 'app-registrar-control',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registrar-control.component.html',
  styleUrl: './registrar-control.component.css'
})
export class RegistrarControlComponent implements OnInit {
  form: FormGroup;
  lote: Lote | null = null;
  historial: ControlDeCalidad[] = [];
  cargando = true;
  guardando = false;
  errorMessage: string | null = null;

  // Se completa cuando el backend responde 409 (CUU02, alternativo 3.a):
  // parametros fuera de rango, a la espera de que el usuario corrija o
  // confirme el rechazo del lote.
  fueraDeRango: RangosFueraDeRango | null = null;

  claseBadgeEstado = claseBadgeEstado;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private loteService: LoteService,
    private controlCalidadService: ControlCalidadService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      tipo_control: ['inicial', Validators.required],
      humedad: [null, [Validators.required, Validators.min(0)]],
      poder_germinativo: [null, [Validators.required, Validators.min(0)]],
      nivel_de_pureza: [null, [Validators.required, Validators.min(0)]],
      descripcion: [''],
    });
  }

  ngOnInit(): void {
    const loteId = Number(this.route.snapshot.paramMap.get('loteId'));
    const tipoSugerido = this.route.snapshot.queryParamMap.get('tipo');
    if (tipoSugerido === 'inicial' || tipoSugerido === 'intermedio') {
      this.form.patchValue({ tipo_control: tipoSugerido });
    }

    this.loteService.getLote(loteId).subscribe({
      next: (lote) => {
        this.lote = lote;
        // Si no vino tipo por query param, lo sugiere segun el estado actual del lote.
        if (!tipoSugerido) {
          this.form.patchValue({ tipo_control: lote.estado_actual === 'En limpieza' ? 'intermedio' : 'inicial' });
        }
        this.cargando = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el lote: ${err.message}`;
        this.cargando = false;
      }
    });

    this.controlCalidadService.getControlesPorLote(loteId).subscribe({
      next: (data) => (this.historial = data),
      error: () => {
        // El historial es informativo (aside): si falla no bloquea el flujo principal.
      }
    });
  }

  get nombreSemilla(): string {
    const ts = this.lote?.tipo_semilla as any;
    return ts?.nombre_semilla ? `${ts.nombre_semilla} / ${ts.variante_semilla}` : '';
  }

  registrar(confirmarNoApto = false): void {
    if (!confirmarNoApto && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.lote?.id_lote) return;

    const valores = this.form.value;
    const payload: RegistrarControlLotePayload = {
      lote_id: this.lote.id_lote,
      tipo_control: valores.tipo_control,
      humedad: valores.humedad,
      poder_germinativo: valores.poder_germinativo,
      nivel_de_pureza: valores.nivel_de_pureza,
      descripcion: valores.descripcion || undefined,
      confirmar_no_apto: confirmarNoApto || undefined,
    };

    this.guardando = true;
    this.controlCalidadService.registrarControlLote(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.fueraDeRango = null;
        this.toastr.success('Control de calidad registrado con exito', 'Registrado');
        this.router.navigate(['/lotes', this.lote!.id_lote]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        if (err.status === 409 && err.error?.fuera_de_rango) {
          // CUU02, alternativo 3.a: pide confirmacion antes de registrar "No apto".
          this.fueraDeRango = err.error.rangos;
          this.toastr.warning(
            'Los parametros ingresados estan fuera de rango. Revisa los datos o confirma el rechazo.',
            'Fuera de rango'
          );
        } else {
          this.toastr.error(err.error?.error || err.message, 'Error al registrar el control');
        }
      }
    });
  }

  corregirDatos(): void {
    this.fueraDeRango = null;
  }

  confirmarNoApto(): void {
    this.registrar(true);
  }
}
