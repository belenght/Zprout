import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { LoteService } from '../../services/lote.service';
import { LotePayload, OrigenSemilla } from '../../models/lote.model';
import { NotificationService } from '../../../../core/services/notification.service';

import { CampoService } from '../../../campo/services/campo.service';
import { Campo } from '../../../campo/models/campo.model';
import { AlmacenService } from '../../../almacen/services/almacen.service';
import { Almacen } from '../../../almacen/models/almacen.model';
import { ProveedorService } from '../../../proveedor/services/proveedor.service';
import { Proveedor } from '../../../proveedor/models/proveedor.model';
import { TipoSemillaService } from '../../../tipo-semilla/services/tipo-semilla.service';
import { TipoSemilla } from '../../../tipo-semilla/models/tipo-semilla.model';

const TIPOS_ARCHIVO_PERMITIDOS = ['application/pdf', 'image/jpeg'];

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
  private almacenService = inject(AlmacenService);
  private proveedorService = inject(ProveedorService);
  private tipoSemillaService = inject(TipoSemillaService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  // combos
  campos = signal<Campo[]>([]);
  almacenes = signal<Almacen[]>([]);
  proveedores = signal<Proveedor[]>([]);
  tiposSemilla = signal<TipoSemilla[]>([]);

  // estado de UI derivado del formulario
  origenSeleccionado = signal<OrigenSemilla>('Propio');
  archivoInforme = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  enviando = signal(false);

  form = this.fb.group({
    origen_semilla: this.fb.nonNullable.control<OrigenSemilla>('Propio', Validators.required),
    nro_campo: this.fb.control<number | null>(null),
    cuit: this.fb.control<string | null>(null),
    id_almacen: this.fb.control<number | null>(null, Validators.required),
    id_semilla: this.fb.control<number | null>(null, Validators.required),
    cantidad_semillas_en_tn: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.1)]),
    descripcion_origen: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)])
  });

  ngOnInit(): void {
    this.campoService.getAll().subscribe((data) => this.campos.set(data));
    this.almacenService.getAll().subscribe((data) => this.almacenes.set(data));
    this.proveedorService.getAll().subscribe((data) => this.proveedores.set(data));
    this.tipoSemillaService.getAll().subscribe((data) => this.tiposSemilla.set(data));

    // Regla de negocio: segun el origen cambian los campos obligatorios.
    // Propio  -> requiere nro_campo, no requiere proveedor/informe.
    // Externo -> requiere cuit (proveedor) + informe de calidad adjunto.
    this.form.controls.origen_semilla.valueChanges.subscribe((origen) => {
      this.origenSeleccionado.set(origen);
      this.actualizarValidadoresPorOrigen(origen);
    });
    this.actualizarValidadoresPorOrigen(this.form.controls.origen_semilla.value);
  }

  private actualizarValidadoresPorOrigen(origen: OrigenSemilla): void {
    const campoNroCampo = this.form.controls.nro_campo;
    const campoCuit = this.form.controls.cuit;

    if (origen === 'Propio') {
      campoNroCampo.setValidators([Validators.required]);
      campoCuit.clearValidators();
      campoCuit.setValue(null);
      this.archivoInforme.set(null);
      this.errorArchivo.set(null);
    } else {
      campoCuit.setValidators([Validators.required]);
      campoNroCampo.clearValidators();
      campoNroCampo.setValue(null);
    }

    campoNroCampo.updateValueAndValidity();
    campoCuit.updateValueAndValidity();
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    if (!archivo) {
      this.archivoInforme.set(null);
      return;
    }

    if (!TIPOS_ARCHIVO_PERMITIDOS.includes(archivo.type)) {
      this.errorArchivo.set('El informe debe ser un archivo PDF o JPG.');
      this.archivoInforme.set(null);
      input.value = '';
      return;
    }

    this.errorArchivo.set(null);
    this.archivoInforme.set(archivo);
  }

  get esExterno(): boolean {
    return this.origenSeleccionado() === 'Externo';
  }

  guardar(): void {
    if (this.esExterno && !this.archivoInforme()) {
      this.errorArchivo.set('Para un lote externo es obligatorio adjuntar el informe de calidad del proveedor.');
    }

    if (this.form.invalid || (this.esExterno && !this.archivoInforme())) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);

    const valores = this.form.getRawValue();
    const payload: LotePayload = {
      origen_semilla: valores.origen_semilla,
      nro_campo: valores.origen_semilla === 'Propio' ? valores.nro_campo : null,
      cuit: valores.origen_semilla === 'Externo' ? valores.cuit : null,
      id_almacen: valores.id_almacen as number,
      id_semilla: valores.id_semilla as number,
      cantidad_semillas_en_tn: valores.cantidad_semillas_en_tn as number,
      descripcion_origen: valores.descripcion_origen
    };

    this.loteService.crear(payload, this.archivoInforme()).subscribe({
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
