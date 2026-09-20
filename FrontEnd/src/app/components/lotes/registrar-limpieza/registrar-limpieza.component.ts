import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { LoteService } from '../../../services/lote.service';
import { LimpiezaService } from '../../../services/limpieza.service';
import { AuthService } from '../../../services/auth.service';
import { Lote } from '../../../interfaces/lote';
import { RegistrarLimpiezaPayload } from '../../../interfaces/limpieza';

/**
 * GUI-08 - "Registrar limpieza y clasificación"
 * CUU03 - el Operario de Planta registra el resultado del procesamiento
 * físico (limpieza + clasificación mecánica) de un lote.
 */
@Component({
  selector: 'app-registrar-limpieza',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registrar-limpieza.component.html',
  styleUrl: './registrar-limpieza.component.css'
})
export class RegistrarLimpiezaComponent implements OnInit {
  form: FormGroup;
  lote: Lote | null = null;
  cargando = true;
  guardando = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private loteService: LoteService,
    private limpiezaService: LimpiezaService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      volumen_restante_tn: [null, [Validators.required, Validators.min(0)]],
      merma_tn: [null, [Validators.required, Validators.min(0)]],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    const loteId = Number(this.route.snapshot.paramMap.get('loteId'));
    this.loteService.getLote(loteId).subscribe({
      next: (lote) => {
        this.lote = lote;
        this.cargando = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el lote: ${err.message}`;
        this.cargando = false;
      }
    });
  }

  get nombreSemilla(): string {
    const ts = this.lote?.tipo_semilla as any;
    return ts?.nombre_semilla ? `${ts.nombre_semilla} / ${ts.variante_semilla}` : '';
  }

  // Ayuda visual del formulario (GUI-08: "El sistema calcula automaticamente
  // la merma %"). El backend solo exige que restante + merma no supere el
  // volumen ingresado; el porcentaje es puramente informativo aca.
  get volumenInicial(): number {
    return this.lote ? Number(this.lote.cantidad_semillas_en_tn) : 0;
  }

  get mermaPorcentaje(): number | null {
    const merma = Number(this.form.value.merma_tn);
    if (!this.volumenInicial || !merma) return null;
    return (merma / this.volumenInicial) * 100;
  }

  get sumaProcesada(): number {
    const restante = Number(this.form.value.volumen_restante_tn) || 0;
    const merma = Number(this.form.value.merma_tn) || 0;
    return restante + merma;
  }

  get excedeVolumenDisponible(): boolean {
    return this.volumenInicial > 0 && this.sumaProcesada > this.volumenInicial;
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.lote?.id_lote) return;

    const valores = this.form.value;
    const payload: RegistrarLimpiezaPayload = {
      lote_id: this.lote.id_lote,
      volumen_restante_tn: valores.volumen_restante_tn,
      merma_tn: valores.merma_tn,
      observaciones: valores.observaciones || undefined,
      operario_id: this.authService.getUserId() ?? undefined,
    };

    this.guardando = true;
    this.limpiezaService.registrarLimpieza(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.toastr.success('Limpieza y clasificacion registrada con exito', 'Registrado');
        this.router.navigate(['/lotes', this.lote!.id_lote]);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        // 409: el lote no esta en "En limpieza" (alternativo 1.a).
        // 400: volumen inconsistente (alternativo 3.a).
        this.toastr.error(err.error?.error || err.message, 'Error al registrar la limpieza');
      }
    });
  }
}
