import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { LoteService } from '../../services/lote.service';
import { LotePayload, OrigenSemilla } from '../../models/lote.model';
import { NotificationService } from '../../../../core/services/notification.service';

import { CampoService } from '../../../campo/services/campo.service';
import { Campo } from '../../../campo/models/campo.model';
import { ProveedorService } from '../../../proveedor/services/proveedor.service';
import { Proveedor } from '../../../proveedor/models/proveedor.model';
import { TipoSemillaService } from '../../../tipo-semilla/services/tipo-semilla.service';
import { TipoSemilla } from '../../../tipo-semilla/models/tipo-semilla.model';

@Component({
  selector: 'app-lote-ingreso',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './lote-ingreso.html'
})
export class LoteIngresoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private loteService = inject(LoteService);
  private campoService = inject(CampoService);
  private proveedorService = inject(ProveedorService);
  private tipoSemillaService = inject(TipoSemillaService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  campos = signal<Campo[]>([]);
  proveedores = signal<Proveedor[]>([]);
  tiposSemilla = signal<TipoSemilla[]>([]);

  origenSeleccionado = signal<OrigenSemilla>('propio');
  enviando = signal(false);

  form = this.fb.group({
    origen_semilla: this.fb.nonNullable.control<OrigenSemilla>('propio', Validators.required),
    tipo_semilla_id: this.fb.control<number | null>(null, Validators.required),
    campo_id: this.fb.control<number | null>(null),
    proveedor_id: this.fb.control<number | null>(null),
    cantidad_semillas_en_tn: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.1)]),
    informe_calidad_externo: this.fb.nonNullable.control(''),
    observaciones: this.fb.nonNullable.control('')
  });

  ngOnInit(): void {
    this.campoService.getAll().subscribe((data) => this.campos.set(data));
    this.proveedorService.getAll().subscribe((data) => this.proveedores.set(data));
    this.tipoSemillaService.getAll().subscribe((data) => this.tiposSemilla.set(data));

    // Segun el origen cambian los campos obligatorios (ver CUU01 en la GUI-05).
    // Propio  -> requiere campo_id.
    // Externo -> requiere proveedor_id; el CC inicial se da por aprobado solo.
    this.form.controls.origen_semilla.valueChanges.subscribe((origen) => {
      this.origenSeleccionado.set(origen);
      this.actualizarValidadoresPorOrigen(origen);
    });
    this.actualizarValidadoresPorOrigen(this.form.controls.origen_semilla.value);
  }

  private actualizarValidadoresPorOrigen(origen: OrigenSemilla): void {
    const campoCampo = this.form.controls.campo_id;
    const campoProveedor = this.form.controls.proveedor_id;

    if (origen === 'propio') {
      campoCampo.setValidators([Validators.required]);
      campoProveedor.clearValidators();
      campoProveedor.setValue(null);
    } else {
      campoProveedor.setValidators([Validators.required]);
      campoCampo.clearValidators();
      campoCampo.setValue(null);
    }

    campoCampo.updateValueAndValidity();
    campoProveedor.updateValueAndValidity();
  }

  get esExterno(): boolean {
    return this.origenSeleccionado() === 'externo';
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const valores = this.form.getRawValue();

    const payload: LotePayload = {
      tipo_semilla_id: valores.tipo_semilla_id as number,
      cantidad_semillas_en_tn: valores.cantidad_semillas_en_tn as number,
      origen_semilla: valores.origen_semilla,
      campo_id: valores.origen_semilla === 'propio' ? (valores.campo_id as number) : undefined,
      proveedor_id: valores.origen_semilla === 'externo' ? (valores.proveedor_id as number) : undefined,
      informe_calidad_externo: valores.origen_semilla === 'externo' ? valores.informe_calidad_externo || undefined : undefined,
      observaciones: valores.observaciones || undefined
    };

    this.loteService.crear(payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.notification.success('Lote registrado correctamente.');
        this.router.navigate(['/lotes']);
      },
      error: () => {
        this.enviando.set(false);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/lotes']);
  }
}
