import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { RolRegistro } from '../../interfaces/login';
import { etiquetaRol } from '../../shared/roles';

// 'bienvenida' = pantalla inicial del boceto ("Ya Tengo Cuenta" / "Soy Nuevo").
// Si preferís que la app abra directo en el formulario de login, cambiá el
// valor inicial de `modo` más abajo a 'login'.
type Modo = 'bienvenida' | 'login' | 'registro';

function passwordsIguales(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const r = group.get('password_repetida')?.value;
  return p && r && p !== r ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  modo: Modo = 'bienvenida';

  form: FormGroup;
  formRegistro: FormGroup;
  showPassword = false;
  cargando = false;

  roles: RolRegistro[] = [];
  rolesCargados = false;
  etiquetaRol = etiquetaRol;

  // Fuerza el redibujado justo despues de cada subscribe: los roles llegan de
  // forma asincrona y sin esto el <select> aparece vacio hasta el proximo evento.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      nombre_usuario: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.formRegistro = this.fb.group(
      {
        nombre: ['', Validators.required],
        apellido: ['', Validators.required],
        nombre_usuario: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        id_rol_solicitado: [null, Validators.required],
        password: ['', [Validators.required, Validators.minLength(8)]],
        password_repetida: ['', Validators.required]
      },
      { validators: passwordsIguales }
    );
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  cambiarModo(modo: Modo): void {
    this.modo = modo;
    if (modo === 'registro' && !this.rolesCargados) {
      this.authService.getRolesRegistro().subscribe({
        next: (roles) => {
          this.roles = roles;
          this.rolesCargados = true;
          this.cd.detectChanges();
        },
        error: () => {
          this.toastr.error('No se pudieron cargar los roles', 'Error');
          this.cd.detectChanges();
        }
      });
    }
  }

  // Muestra el error de un control solo despues de tocarlo.
  invalido(grupo: FormGroup, campo: string): boolean {
    const c = grupo.get(campo);
    return !!c && c.invalid && c.touched;
  }

  login(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.authService.login(this.form.value).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.cargando = false;
        // 403 = cuenta pendiente/rechazada: el backend manda el mensaje exacto.
        const mensaje = err?.status === 403
          ? err.error?.error
          : 'Usuario o contraseña incorrectos';
        this.toastr.error(mensaje, 'Error de acceso');
        console.error('Error en login:', err);
        this.cd.detectChanges();
      }
    });
  }

  registrar(): void {
    if (this.formRegistro.invalid) {
      this.formRegistro.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.authService.registro(this.formRegistro.value).subscribe({
      next: (res) => {
        this.cargando = false;
        this.toastr.success(res.message, 'Solicitud enviada');
        this.formRegistro.reset();
        this.cambiarModo('login');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        this.toastr.error(err?.error?.error ?? 'No se pudo crear la cuenta', 'Error');
        this.cd.detectChanges();
      }
    });
  }
}