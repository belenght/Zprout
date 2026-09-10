import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { LimpiezaClasificacionService } from '../../services/limpieza-clasificacion.service';
import { LimpiezaPayload } from '../../models/limpieza-clasificacion.model';
import { LoteService } from '../../../lote/services/lote.service';
import { Lote } from '../../../lote/models/lote.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-limpieza-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './limpieza-form.html'
})
export class LimpiezaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(LimpiezaClasificacionService);
  private loteService = inject(LoteService);
  private notification = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  lote = signal<Lote | null>(null);
  enviando = signal(false);
  errorConsistencia = signal<string | null>(null);

  form = this.fb.group({
    volumen_restante_tn: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    merma_tn: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    observaciones: this.fb.nonNullable.control('')
  });

  // El backend no calcula ni devuelve el %; es solo una ayuda visual (GUI-08:
  // "el sistema calcula automaticamente la merma %").
  mermaPorcentaje = computed(() => {
    const l = this.lote();
    const merma = this.form.controls.merma_tn.value;
    if (!l || merma == null) return null;
    const ingresado = Number(l.cantidad_semillas_en_tn);
    if (!ingresado) return null;
    return ((merma / ingresado) * 100).toFixed(1);
  });

  ngOnInit(): void {
    const loteId = Number(this.route.snapshot.queryParamMap.get('loteId'));
    if (loteId) {
      this.loteService.getById(loteId).subscribe((lote) => this.lote.set(lote));
    }

    // Forzar recalculo del % de merma cuando cambia el volumen restante o la merma.
    this.form.valueChanges.subscribe(() => this.errorConsistencia.set(null));
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.lote()) return;

    const valores = this.form.getRawValue();
    const payload: LimpiezaPayload = {
      lote_id: this.lote()!.id_lote,
      volumen_restante_tn: valores.volumen_restante_tn as number,
      merma_tn: valores.merma_tn as number,
      observaciones: valores.observaciones || undefined
    };

    this.enviando.set(true);
    this.service.registrar(payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.notification.success('Limpieza registrada. El lote pasó a "Para curar".');
        this.router.navigate(['/lotes', 'detalle', payload.lote_id]);
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        // El backend valida que volumen_restante + merma no supere lo ingresado,
        // y que el lote este en 'En limpieza' (400/409, ver el controller).
        this.errorConsistencia.set(err.error?.error ?? 'No se pudo registrar la limpieza.');
      }
    });
  }
}
