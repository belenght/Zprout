import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  errorLogin = signal<string | null>(null);

  form = this.fb.group({
    usuario: ['', Validators.required],
    contrasena: ['', Validators.required]
  });

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorLogin.set(null);

    const payload = this.form.getRawValue() as { usuario: string; contrasena: string };

    this.auth.login(payload).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.cargando.set(false);
        this.errorLogin.set('Usuario o contrasena incorrectos.');
      }
    });
  }
}
