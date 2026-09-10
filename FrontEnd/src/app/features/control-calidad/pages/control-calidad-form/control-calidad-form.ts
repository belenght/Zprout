import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { ControlCalidadService } from '../../services/control-calidad.service';
import { ControlCalidadLotePayload, RangoRespuesta, TipoControlCalidad } from '../../models/control-calidad.model';
import { LoteService } from '../../../lote/services/lote.service';
import { Lote } from '../../../lote/models/lote.model';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ViolacionRango,
  etiquetaCampoCalidad,
  rangoCalidadValidator
} from '../../../../shared/validators/range.validator';

// Estados de Lote sobre los que ya no tiene sentido registrar un CC (ver
// estado_nombres.ts del backend): son estados terminales para el lote.
const ESTADOS_SIN_CC = ['No apto', 'Venta como grano', 'Descarte'];

@Component({
  selector: 'app-control-calidad-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './control-calidad-form.html'
})
export class ControlCalidadFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ControlCalidadService);
  private loteService = inject(LoteService);
  private notification = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  lotes = signal<Lote[]>([]);
  loteSeleccionado = signal<Lote | null>(null);
  enviando = signal(false);

  // Tarjeta de "parametros fuera de rango" (variante de GUI-07). Se llena
  // recien cuando el backend responde 409 con fuera_de_rango: true.
  rangosFueraDeRango = signal<RangoRespuesta['rangos'] | null>(null);
  etiquetaCampo = etiquetaCampoCalidad;

  form = this.fb.group(
    {
      lote_id: this.fb.control<number | null>(null, Validators.required),
      tipo_control: this.fb.nonNullable.control<Extract<TipoControlCalidad, 'inicial' | 'intermedio'>>('inicial', Validators.required),
      humedad: this.fb.control<number | null>(null, Validators.required),
      poder_germinativo: this.fb.control<number | null>(null, Validators.required),
      nivel_de_pureza: this.fb.control<number | null>(null, Validators.required),
      descripcion: this.fb.nonNullable.control('')
    },
    { validators: rangoCalidadValidator(() => this.loteSeleccionado()?.tipo_semilla ?? null) }
  );

  // Alerta local (front) por rango, ANTES de mandar nada al backend.
  // El backend igual vuelve a validar (409) — esto es solo para feedback inmediato.
  violacionesLocales = computed<ViolacionRango[]>(() => (this.form.errors?.['rangoCalidad'] as ViolacionRango[]) ?? []);
  mostrarAlertaLocal = signal(false);

  ngOnInit(): void {
    this.loteService.cargarLotes();
    this.loteService.lotes$.subscribe((lotes) =>
      this.lotes.set(lotes.filter((l) => !ESTADOS_SIN_CC.includes(l.estado_actual ?? '')))
    );

    this.form.controls.lote_id.valueChanges.subscribe((idLote) => {
      this.mostrarAlertaLocal.set(false);
      this.rangosFueraDeRango.set(null);
      const lote = this.lotes().find((l) => l.id_lote === idLote) ?? null;
      this.loteSeleccionado.set(lote);
      // "Pendiente CC" -> todavia no tuvo ningun control -> inicial.
      // Cualquier otro estado activo -> ya paso el inicial -> intermedio.
      this.form.controls.tipo_control.setValue(lote?.estado_actual === 'Pendiente CC' ? 'inicial' : 'intermedio');
      this.form.updateValueAndValidity();
    });

    // Si se llega desde la Bandeja de Calidad (GUI-14) con el lote precargado.
    const loteIdParam = this.route.snapshot.queryParamMap.get('loteId');
    if (loteIdParam) {
      this.form.controls.lote_id.setValue(Number(loteIdParam));
    }
  }

  intentarGuardar(): void {
    this.form.markAllAsTouched();
    if (this.form.controls.lote_id.invalid || this.form.controls.humedad.invalid) {
      return;
    }

    if (this.violacionesLocales().length > 0) {
      this.mostrarAlertaLocal.set(true);
      return;
    }

    this.registrar(false);
  }

  cancelar(): void {
    this.router.navigate(['/lotes']);
  }

  tieneViolacion(campo: ViolacionRango['campo']): boolean {
    return this.violacionesLocales().some((v) => v.campo === campo);
  }

  campoClase(campo: ViolacionRango['campo']): string {
    return this.mostrarAlertaLocal() && this.tieneViolacion(campo)
      ? 'border-red-400 focus:ring-red-400'
      : 'border-stone-300 focus:ring-brand-600';
  }

  corregirDatos(): void {
    this.mostrarAlertaLocal.set(false);
    this.rangosFueraDeRango.set(null);
  }

  confirmarNoApto(): void {
    this.registrar(true);
  }

  private registrar(confirmarNoApto: boolean): void {
    const valores = this.form.getRawValue();

    const payload: ControlCalidadLotePayload = {
      lote_id: valores.lote_id as number,
      tipo_control: valores.tipo_control,
      humedad: valores.humedad as number,
      poder_germinativo: valores.poder_germinativo as number,
      nivel_de_pureza: valores.nivel_de_pureza as number,
      descripcion: valores.descripcion || undefined,
      confirmar_no_apto: confirmarNoApto || undefined
    };

    this.enviando.set(true);
    this.service.registrarSobreLote(payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.notification.success(
          confirmarNoApto ? 'Control registrado. El lote quedó marcado como No Apto.' : 'Control de calidad registrado. Lote apto.'
        );
        this.router.navigate(['/lotes', 'detalle', payload.lote_id]);
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        // Variante de GUI-07: 409 con los rangos reales del TipoDeSemilla.
        if (err.status === 409 && err.error?.fuera_de_rango) {
          this.mostrarAlertaLocal.set(true);
          this.rangosFueraDeRango.set((err.error as RangoRespuesta).rangos);
        }
      }
    });
  }
}
