import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { TipoSemillaService } from '../../services/tipo-semilla.service';
import { TipoSemillaPayload } from '../../models/tipo-semilla.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-tipo-semilla-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './tipo-semilla-form.html',
  styleUrl: './tipo-semilla-form.css'
})
export class TipoSemillaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(TipoSemillaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notification = inject(NotificationService);

  modoEdicion = signal(false);
  private idActual: number | null = null;

  // Los rangos min/max de esta semilla son la base del validador
  // reactivo que despues usa el modulo de Calidad (range.validator.ts)
  // para comparar los resultados de cada control de calidad.
  form = this.fb.group({
    nombre_semilla: ['', [Validators.required, Validators.maxLength(100)]],
    variante_semilla: ['', [Validators.required, Validators.maxLength(100)]],
    humedad_min: [0, [Validators.required, Validators.min(0)]],
    humedad_max: [0, [Validators.required, Validators.min(0)]],
    poder_germinativo_min: [0, [Validators.required, Validators.min(0)]],
    poder_germinativo_max: [0, [Validators.required, Validators.min(0)]],
    nivel_pureza_min: [0, [Validators.required, Validators.min(0)]],
    nivel_pureza_max: [0, [Validators.required, Validators.min(0)]],
    duracion: [0, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.modoEdicion.set(true);
      this.idActual = Number(idParam);
      this.service.getById(this.idActual).subscribe((item) => {
        this.form.patchValue(item);
      });
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue() as TipoSemillaPayload;
    const request$ = this.modoEdicion() && this.idActual !== null
      ? this.service.update(this.idActual, payload)
      : this.service.create(payload);

    request$.subscribe(() => {
      this.notification.success('Guardado correctamente');
      this.router.navigate(['/tipo-semilla']);
    });
  }

  cancelar(): void {
    this.router.navigate(['/tipo-semilla']);
  }
}
