import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ControlCalidadService } from '../../services/control-calidad.service';
import { ControlCalidadPayload } from '../../models/control-calidad.model';
import { LoteService } from '../../../lote/services/lote.service';
import { Lote } from '../../../lote/models/lote.model';
import { TipoSemillaService } from '../../../tipo-semilla/services/tipo-semilla.service';
import { TipoSemilla } from '../../../tipo-semilla/models/tipo-semilla.model';
import { EstadoService } from '../../../estado/services/estado.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  ViolacionRango,
  etiquetaCampoCalidad,
  rangoCalidadValidator
} from '../../../../shared/validators/range.validator';

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
  private tipoSemillaService = inject(TipoSemillaService);
  private estadoService = inject(EstadoService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  lotes = signal<Lote[]>([]);
  tipoSemillaSeleccionada = signal<TipoSemilla | null>(null);

  // Bandera separada del estado "invalid" del form: solo se muestra la tarjeta
  // de alerta una vez que el usuario intento enviar, no mientras esta tipeando.
  mostrarAlertaFueraDeRango = signal(false);
  etiquetaCampo = etiquetaCampoCalidad;

  form = this.fb.group(
    {
      nro_lote: this.fb.control<number | null>(null, Validators.required),
      humedad: this.fb.control<number | null>(null, Validators.required),
      poder_germinativo: this.fb.control<number | null>(null, Validators.required),
      nivel_de_pureza: this.fb.control<number | null>(null, Validators.required),
      descripcion: this.fb.control('')
    },
    { validators: rangoCalidadValidator(() => this.tipoSemillaSeleccionada()) }
  );

  violaciones = computed<ViolacionRango[]>(() => (this.form.errors?.['rangoCalidad'] as ViolacionRango[]) ?? []);

  ngOnInit(): void {
    this.loteService.cargarLotes();
    this.loteService.lotes$.subscribe((lotes) => this.lotes.set(lotes));

    this.form.controls.nro_lote.valueChanges.subscribe((nroLote) => {
      this.mostrarAlertaFueraDeRango.set(false);
      if (nroLote == null) {
        this.tipoSemillaSeleccionada.set(null);
        return;
      }
      this.loteService.getById(nroLote).subscribe((lote) => {
        this.tipoSemillaSeleccionada.set(lote.tipo_semilla);
        this.form.updateValueAndValidity();
      });
    });
  }

  intentarGuardar(): void {
    this.form.markAllAsTouched();

    if (this.form.getRawValue().nro_lote == null || this.form.controls.humedad.invalid) {
      return;
    }

    if (this.violaciones().length > 0) {
      this.mostrarAlertaFueraDeRango.set(true);
      return;
    }

    this.guardarControl('Apto');
  }

  corregirDatos(): void {
    this.mostrarAlertaFueraDeRango.set(false);
    this.form.reset({ nro_lote: this.form.controls.nro_lote.value });
  }

  confirmarNoApto(): void {
    this.guardarControl('No Apto');
  }

  private guardarControl(resultado: 'Apto' | 'No Apto'): void {
    const valores = this.form.getRawValue();

    const payload: ControlCalidadPayload = {
      nro_lote: valores.nro_lote,
      nro_partida: null,
      fecha: new Date().toISOString(),
      humedad: valores.humedad as number,
      poder_germinativo: valores.poder_germinativo as number,
      nivel_de_pureza: valores.nivel_de_pureza as number,
      tipo_control: 'Inicial',
      descripcion: valores.descripcion || null
    };

    this.service.create(payload).subscribe(() => {
      if (resultado === 'No Apto' && valores.nro_lote != null) {
        // TODO(modulo Calidad, tarea aparte): esto todavia no pega contra el
        // backend real. Estado no tiene endpoint de escritura (ver
        // estado.controller.ts) -- el cambio de estado lo dispara el propio
        // backend a traves de cambiarEstado() cuando se registra el CC en
        // /api/controles-calidad/lote, no una llamada aparte desde el front.
        this.notification.success('Control registrado. El lote quedo marcado como No Apto.');
        // TODO: redirigir al flujo de "definir destino fisico" (Venta como grano / Descarte)
        // cuando ese modulo exista.
      } else {
        this.notification.success('Control de calidad registrado. Lote apto.');
      }

      this.router.navigate(['/lotes']);
    });
  }
}
