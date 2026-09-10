import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlmacenService } from '../../services/almacen.service';
import { AlmacenPayload, TipoAlmacen } from '../../models/almacen.model';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-almacen-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './almacen-form.html'
})
export class AlmacenFormComponent {
  private fb = inject(FormBuilder);
  private service = inject(AlmacenService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  enviando = signal(false);

  form = this.fb.group({
    tipo: this.fb.nonNullable.control<TipoAlmacen>('silo', Validators.required),
    capacidad: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.1)])
  });

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const valores = this.form.getRawValue();
    const payload: AlmacenPayload = {
      tipo: valores.tipo,
      capacidad: String(valores.capacidad)
    };

    this.enviando.set(true);
    this.service.create(payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.notification.success('Almacén creado correctamente.');
        this.router.navigate(['/almacen']);
      },
      error: () => this.enviando.set(false)
    });
  }
}
