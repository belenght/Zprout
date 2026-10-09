import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { UsuarioService } from '../../services/usuario.service';
import { AuthService } from '../../services/auth.service';
import { RolRegistro } from '../../interfaces/login';
import { ActualizarUsuarioAdminPayload, UsuarioAdmin } from '../../interfaces/usuario-admin';
import { ROL_ADMIN, etiquetaRol } from '../../shared/roles';
import { exportarCsv, fechaCsv } from '../../shared/exportar-csv';

const SIN_MARKUP = /^[^<>]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO_PATTERN = /^[A-Za-z0-9_.-]{3,50}$/;

type FiltroCuenta = 'todos' | 'activos' | 'deshabilitados' | 'pendientes';

function fechaNoFutura(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string | null;
  if (!valor) return null;
  return valor > new Date().toISOString().slice(0, 10) ? { futura: true } : null;
}

function passwordsCoinciden(group: AbstractControl): ValidationErrors | null {
  const a = group.get('password_nueva')?.value;
  const b = group.get('password_repetida')?.value;
  return a && b && a !== b ? { noCoinciden: true } : null;
}

/**
 * Gestion de usuarios (solo administrador, ver RoleGuard en app.routes.ts).
 * Listado con busqueda y filtros + panel lateral con el detalle de cada
 * persona: editar sus datos, usuario y rol, habilitar/deshabilitar la cuenta,
 * restablecer su contrasena y eliminarla. El alta/rechazo de solicitudes sigue
 * siendo de la pantalla "Solicitudes".
 */
@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css'
})
export class UsuariosComponent implements OnInit {
  usuarios: UsuarioAdmin[] = [];
  roles: RolRegistro[] = [];
  cargando = true;
  errorMessage: string | null = null;

  busqueda = '';
  filtroCuenta: FiltroCuenta = 'todos';
  filtroRol: number | null = null;

  // Panel de detalle
  seleccionado: UsuarioAdmin | null = null;
  cargandoDetalle = false;
  guardando = false;
  guardandoPassword = false;
  eliminando = false;
  confirmandoEliminar = false;
  confirmandoQuitarAdmin = false;

  formDatos: FormGroup;
  formPassword: FormGroup;

  readonly hoy = new Date().toISOString().slice(0, 10);
  etiquetaRol = etiquetaRol;

  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private usuarioService: UsuarioService,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.formDatos = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(SIN_MARKUP)]],
      apellido: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(SIN_MARKUP)]],
      email: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(EMAIL_PATTERN)]],
      nombre_usuario: ['', [Validators.required, Validators.pattern(USUARIO_PATTERN)]],
      fecha_nacimiento: ['', [fechaNoFutura]],
      id_rol: [null as number | null, Validators.required],
      activo: [true],
    });
    this.formPassword = this.fb.group(
      {
        password_nueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
        password_repetida: ['', Validators.required],
      },
      { validators: passwordsCoinciden }
    );
  }

  ngOnInit(): void {
    this.cargar();
  }

  get miId(): number | null {
    return this.authService.getUserId();
  }

  cargar(): void {
    this.cargando = true;
    this.errorMessage = null;
    forkJoin({
      usuarios: this.usuarioService.getUsuariosGestion(),
      roles: this.usuarioService.getRolesAsignables(),
    }).subscribe({
      next: ({ usuarios, roles }) => {
        // La propia cuenta no se lista: se edita desde "Mi perfil".
        this.usuarios = usuarios.filter((u) => !this.esYo(u));
        this.roles = roles;
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar los usuarios: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }

  // ----- Listado -----

  get filtrados(): UsuarioAdmin[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.usuarios.filter((u) => {
      if (this.filtroCuenta === 'activos' && !(u.estado === 'activo' && u.activo)) return false;
      if (this.filtroCuenta === 'deshabilitados' && u.activo) return false;
      if (this.filtroCuenta === 'pendientes' && u.estado !== 'pendiente') return false;
      if (this.filtroRol !== null && u.rol?.id_rol !== this.filtroRol) return false;
      if (!q) return true;
      return `${u.nombre} ${u.apellido} ${u.nombre_usuario} ${u.email}`.toLowerCase().includes(q);
    });
  }

  get totalActivos(): number {
    return this.usuarios.filter((u) => u.estado === 'activo' && u.activo).length;
  }
  get totalDeshabilitados(): number {
    return this.usuarios.filter((u) => !u.activo).length;
  }
  get totalPendientes(): number {
    return this.usuarios.filter((u) => u.estado === 'pendiente').length;
  }

  setFiltroCuenta(f: FiltroCuenta): void {
    this.filtroCuenta = f;
  }

  iniciales(u: UsuarioAdmin): string {
    return `${u.nombre?.[0] ?? ''}${u.apellido?.[0] ?? ''}`.toUpperCase();
  }

  esYo(u: UsuarioAdmin): boolean {
    return u.id_usuario === this.miId;
  }

  // Estado de la cuenta para mostrar (una cuenta deshabilitada manda sobre el estado de alta).
  etiquetaCuenta(u: UsuarioAdmin): string {
    if (!u.activo) return 'Deshabilitada';
    if (u.estado === 'pendiente') return 'Pendiente';
    if (u.estado === 'rechazado') return 'Rechazada';
    return 'Activa';
  }

  claseCuenta(u: UsuarioAdmin): string {
    switch (this.etiquetaCuenta(u)) {
      case 'Activa': return 'bg-[#dff3e4] text-[#1b7a43]';
      case 'Pendiente': return 'bg-[#fbeacb] text-[#8a5a0b]';
      case 'Rechazada': return 'bg-[#fbe1e1] text-[#9b2c2c]';
      default: return 'bg-[#e8ecea] text-[#4a5a52]';
    }
  }

  claseRol(u: UsuarioAdmin): string {
    const clases: Record<string, string> = {
      administrador: 'bg-[#e3dcf5] text-[#4b3a8c]',
      encargado_acopio: 'bg-[#dbe9f9] text-[#1d4e89]',
      responsable_calidad: 'bg-[#dff3e4] text-[#1b7a43]',
      operario_planta: 'bg-[#fbeacb] text-[#8a5a0b]',
      encargado_comercial: 'bg-[#fbe1e1] text-[#9b2c2c]',
    };
    return clases[u.rol?.desc_rol ?? ''] ?? 'bg-[#e8ecea] text-[#4a5a52]';
  }

  // ----- Panel de detalle -----

  abrir(u: UsuarioAdmin): void {
    this.seleccionado = { ...u, foto: null };
    this.cargandoDetalle = true;
    this.confirmandoEliminar = false;
    this.confirmandoQuitarAdmin = false;
    this.cargarFormulario(u);
    this.formPassword.reset({ password_nueva: '', password_repetida: '' });
    this.usuarioService.getUsuarioGestion(u.id_usuario).subscribe({
      next: (detalle) => {
        if (this.seleccionado?.id_usuario === detalle.id_usuario) this.seleccionado = detalle;
        this.cargandoDetalle = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.cargandoDetalle = false;
        this.cd.detectChanges();
      }
    });
  }

  cerrar(): void {
    this.seleccionado = null;
    this.confirmandoEliminar = false;
    this.confirmandoQuitarAdmin = false;
  }

  private cargarFormulario(u: UsuarioAdmin): void {
    this.formDatos.reset({
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      nombre_usuario: u.nombre_usuario,
      fecha_nacimiento: u.fecha_nacimiento ?? '',
      id_rol: u.rol?.id_rol ?? null,
      activo: u.activo,
    });
    this.confirmandoQuitarAdmin = false;
  }

  get fueAdmin(): boolean {
    return this.seleccionado?.rol?.desc_rol === ROL_ADMIN;
  }

  // Cambiar el rol de un administrador a otro le saca los permisos de admin.
  get quitaAdmin(): boolean {
    if (!this.fueAdmin) return false;
    const id = this.formDatos.value.id_rol;
    const elegido = this.roles.find((r) => r.id_rol === id);
    return !!elegido && elegido.desc_rol !== ROL_ADMIN;
  }

  guardar(): void {
    const u = this.seleccionado;
    if (!u) return;
    if (this.formDatos.invalid) {
      this.formDatos.markAllAsTouched();
      this.toastr.warning('Revisá los campos marcados en rojo antes de guardar', 'Formulario incompleto');
      return;
    }
    if (this.quitaAdmin && !this.confirmandoQuitarAdmin) {
      this.confirmandoQuitarAdmin = true;
      return;
    }
    const v = this.formDatos.value;
    const payload: ActualizarUsuarioAdminPayload = {
      nombre: v.nombre,
      apellido: v.apellido,
      email: v.email,
      nombre_usuario: String(v.nombre_usuario).trim(),
      fecha_nacimiento: v.fecha_nacimiento || null,
      activo: !!v.activo,
    };
    if (v.id_rol != null) payload.id_rol = v.id_rol;

    this.guardando = true;
    this.usuarioService.actualizarUsuarioGestion(u.id_usuario, payload).subscribe({
      next: (actualizado) => {
        this.guardando = false;
        this.usuarios = this.usuarios.map((x) => (x.id_usuario === actualizado.id_usuario ? { ...actualizado, foto: undefined } : x));
        this.seleccionado = actualizado;
        this.cargarFormulario(actualizado);
        this.toastr.success('Los datos del usuario se actualizaron', 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.guardando = false;
        this.confirmandoQuitarAdmin = false;
        this.toastr.error(err.message, 'No se pudo guardar');
        this.cd.detectChanges();
      }
    });
  }

  restablecerPassword(): void {
    const u = this.seleccionado;
    if (!u) return;
    if (this.formPassword.invalid) {
      this.formPassword.markAllAsTouched();
      return;
    }
    const v = this.formPassword.value;
    this.guardandoPassword = true;
    this.usuarioService.restablecerPassword(u.id_usuario, v.password_nueva, v.password_repetida).subscribe({
      next: () => {
        this.guardandoPassword = false;
        this.formPassword.reset({ password_nueva: '', password_repetida: '' });
        this.toastr.success(`Se cambió la contraseña de ${u.nombre_usuario}`, 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.guardandoPassword = false;
        this.toastr.error(err.message, 'No se pudo cambiar la contraseña');
        this.cd.detectChanges();
      }
    });
  }

  eliminar(): void {
    const u = this.seleccionado;
    if (!u) return;
    this.eliminando = true;
    this.usuarioService.eliminarUsuarioGestion(u.id_usuario).subscribe({
      next: () => {
        this.eliminando = false;
        this.usuarios = this.usuarios.filter((x) => x.id_usuario !== u.id_usuario);
        this.cerrar();
        this.toastr.success(`Se eliminó la cuenta de ${u.nombre_usuario}`, 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.eliminando = false;
        this.confirmandoEliminar = false;
        this.toastr.error(err.message, 'No se pudo eliminar');
        this.cd.detectChanges();
      }
    });
  }

  invalido(form: FormGroup, campo: string): boolean {
    const c = form.get(campo);
    return !!c && c.invalid && c.touched;
  }

  exportar(): void {
    exportarCsv(
      'usuarios',
      ['Usuario', 'Nombre', 'Apellido', 'Email', 'Rol', 'Cuenta', 'Alta'],
      this.filtrados.map((u) => [u.nombre_usuario, u.nombre, u.apellido, u.email, etiquetaRol(u.rol?.desc_rol), u.estado, fechaCsv(u.created_at)]),
    );
  }
}
