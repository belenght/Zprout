import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ActualizarPerfilPayload, Perfil, PerfilService } from '../../services/perfil.service';
import { UsuarioService } from '../../services/usuario.service';
import { RolRegistro } from '../../interfaces/login';
import { ROL_ADMIN, etiquetaRol } from '../../shared/roles';

const SIN_MARKUP = /^[^<>]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USUARIO_PATTERN = /^[A-Za-z0-9_.-]{3,50}$/;

// La foto se recorta en cuadrado y se achica antes de subirla: el backend
// la guarda en la base y express.json() corta en 100 kb por request.
const FOTO_LADO_PX = 256;
const FOTO_MAX_BYTES = 60 * 1024;
const ARCHIVO_MAX_BYTES = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

function fechaNoFutura(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string | null;
  if (!valor) return null;
  return valor > new Date().toISOString().slice(0, 10) ? { futura: true } : null;
}

function passwordsCoinciden(grupo: AbstractControl): ValidationErrors | null {
  const nueva = grupo.get('password_nueva')?.value;
  const repetida = grupo.get('password_repetida')?.value;
  return nueva && repetida && nueva !== repetida ? { noCoinciden: true } : null;
}

/**
 * "Mi perfil": foto, datos personales y cambio de contrasena del usuario
 * logueado. El nombre de usuario y el rol los cambia un administrador.
 */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  perfil: Perfil | null = null;
  cargando = true;
  errorMessage: string | null = null;

  formDatos: FormGroup;
  formPassword: FormGroup;
  guardandoDatos = false;
  guardandoPassword = false;
  guardandoFoto = false;

  // Foto elegida pero todavia no guardada (vista previa).
  fotoNueva: string | null = null;
  confirmandoQuitarFoto = false;

  // Solo para administradores: pueden cambiar su usuario y su rol.
  roles: RolRegistro[] = [];
  confirmandoRol = false;
  etiquetaRol = etiquetaRol;

  readonly hoy = new Date().toISOString().slice(0, 10);

  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private perfilService: PerfilService,
    private usuarioService: UsuarioService,
    private toastr: ToastrService
  ) {
    this.formDatos = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(SIN_MARKUP)]],
      apellido: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(SIN_MARKUP)]],
      email: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(EMAIL_PATTERN)]],
      fecha_nacimiento: ['', [fechaNoFutura]],
      nombre_usuario: ['', [Validators.pattern(USUARIO_PATTERN)]],
      id_rol: [null as number | null],
    });
    this.formPassword = this.fb.group(
      {
        password_actual: ['', Validators.required],
        password_nueva: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
        password_repetida: ['', Validators.required],
      },
      { validators: passwordsCoinciden }
    );
  }

  ngOnInit(): void {
    this.perfilService.cargar().subscribe({
      next: (perfil) => {
        this.perfil = perfil;
        this.cargarFormulario(perfil);
        this.cargando = false;
        this.cd.detectChanges();
        this.cargarRolesSiAdmin();
      },
      error: (err) => {
        this.errorMessage = `Error al cargar tu perfil: ${err.message}`;
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }

  get esAdmin(): boolean {
    return this.perfil?.rol === ROL_ADMIN;
  }

  // El administrador puede elegir entre todos los roles (incluido administrador).
  private cargarRolesSiAdmin(): void {
    if (!this.esAdmin) return;
    this.usuarioService.getRolesAsignables().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.cd.detectChanges();
      },
      error: () => {
        this.toastr.warning('No se pudo cargar la lista de roles', 'Roles');
        this.cd.detectChanges();
      }
    });
  }

  // Cambiar a un rol que no es administrador le saca a esta cuenta los permisos de admin.
  get dejaDeSerAdmin(): boolean {
    if (!this.esAdmin) return false;
    const idElegido = this.formDatos.value.id_rol;
    if (idElegido == null || idElegido === this.perfil?.id_rol) return false;
    const elegido = this.roles.find((r) => r.id_rol === idElegido);
    return !!elegido && elegido.desc_rol !== ROL_ADMIN;
  }

  private cargarFormulario(perfil: Perfil): void {
    this.formDatos.reset({
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      email: perfil.email,
      fecha_nacimiento: perfil.fecha_nacimiento ?? '',
      nombre_usuario: perfil.nombre_usuario,
      id_rol: perfil.id_rol,
    });
    this.confirmandoRol = false;
  }

  get iniciales(): string {
    const p = this.perfil;
    if (!p) return '';
    return `${p.nombre[0] ?? ''}${p.apellido[0] ?? ''}`.toUpperCase();
  }

  get fotoMostrada(): string | null {
    return this.fotoNueva ?? this.perfil?.foto ?? null;
  }

  // ----- Foto -----

  async onArchivoElegido(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite elegir de nuevo el mismo archivo
    if (!archivo) return;

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      this.toastr.warning('Elegí una imagen JPG, PNG o WebP', 'Formato no permitido');
      return;
    }
    if (archivo.size > ARCHIVO_MAX_BYTES) {
      this.toastr.warning('La imagen no puede pesar más de 10 MB', 'Imagen muy grande');
      return;
    }
    try {
      this.fotoNueva = await this.prepararFoto(archivo);
      this.confirmandoQuitarFoto = false;
    } catch (e) {
      this.toastr.error((e as Error).message, 'No se pudo usar la imagen');
    }
    this.cd.detectChanges();
  }

  // Recorta al centro en cuadrado, achica y comprime a JPEG hasta que entre en el limite.
  private async prepararFoto(archivo: File): Promise<string> {
    const url = URL.createObjectURL(archivo);
    try {
      const img = await new Promise<HTMLImageElement>((ok, fallo) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => fallo(new Error('No se pudo leer la imagen'));
        i.src = url;
      });
      const lado = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - lado) / 2;
      const sy = (img.naturalHeight - lado) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = FOTO_LADO_PX;
      canvas.height = FOTO_LADO_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen');
      ctx.fillStyle = '#ffffff'; // los PNG con transparencia quedan sobre fondo blanco
      ctx.fillRect(0, 0, FOTO_LADO_PX, FOTO_LADO_PX);
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, FOTO_LADO_PX, FOTO_LADO_PX);

      for (let calidad = 0.9; calidad >= 0.4; calidad -= 0.1) {
        const data = canvas.toDataURL('image/jpeg', calidad);
        const bytes = ((data.length - data.indexOf(',') - 1) * 3) / 4;
        if (bytes <= FOTO_MAX_BYTES) return data;
      }
      throw new Error('La imagen es demasiado compleja, probá con otra');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  guardarFoto(): void {
    if (!this.fotoNueva) return;
    this.guardandoFoto = true;
    this.perfilService.subirFoto(this.fotoNueva).subscribe({
      next: () => {
        this.guardandoFoto = false;
        this.fotoNueva = null;
        this.perfil = this.perfilService.perfilActual ?? this.perfil;
        this.toastr.success('Foto de perfil actualizada', 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.guardandoFoto = false;
        this.toastr.error(err.message, 'No se pudo guardar la foto');
        this.cd.detectChanges();
      }
    });
  }

  cancelarFoto(): void {
    this.fotoNueva = null;
  }

  quitarFoto(): void {
    this.guardandoFoto = true;
    this.perfilService.eliminarFoto().subscribe({
      next: () => {
        this.guardandoFoto = false;
        this.confirmandoQuitarFoto = false;
        this.perfil = this.perfilService.perfilActual ?? this.perfil;
        this.toastr.success('Foto de perfil eliminada', 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.guardandoFoto = false;
        this.toastr.error(err.message, 'No se pudo quitar la foto');
        this.cd.detectChanges();
      }
    });
  }

  // ----- Datos personales -----

  guardarDatos(): void {
    if (this.formDatos.invalid) {
      this.formDatos.markAllAsTouched();
      this.toastr.warning('Revisá los campos marcados en rojo antes de guardar', 'Formulario incompleto');
      return;
    }
    if (this.dejaDeSerAdmin && !this.confirmandoRol) {
      this.confirmandoRol = true;
      return;
    }
    const v = this.formDatos.value;
    const payload: ActualizarPerfilPayload = {
      nombre: v.nombre,
      apellido: v.apellido,
      email: v.email,
      fecha_nacimiento: v.fecha_nacimiento || null,
    };
    if (this.esAdmin) {
      payload.nombre_usuario = String(v.nombre_usuario).trim();
      if (v.id_rol != null) payload.id_rol = v.id_rol;
    }
    this.guardandoDatos = true;
    this.perfilService
      .actualizar(payload)
      .subscribe({
        next: (perfil) => {
          this.guardandoDatos = false;
          this.perfil = perfil;
          this.cargarFormulario(perfil);
          this.toastr.success('Tus datos se actualizaron', 'Listo');
          this.cd.detectChanges();
        },
        error: (err) => {
          this.guardandoDatos = false;
          this.toastr.error(err.message, 'No se pudieron guardar los datos');
          this.cd.detectChanges();
        }
      });
  }

  // ----- Contrasena -----

  cambiarPassword(): void {
    if (this.formPassword.invalid) {
      this.formPassword.markAllAsTouched();
      return;
    }
    this.guardandoPassword = true;
    this.perfilService.cambiarPassword(this.formPassword.value).subscribe({
      next: () => {
        this.guardandoPassword = false;
        this.formPassword.reset({ password_actual: '', password_nueva: '', password_repetida: '' });
        this.toastr.success('Tu contraseña se actualizó', 'Listo');
        this.cd.detectChanges();
      },
      error: (err) => {
        this.guardandoPassword = false;
        this.toastr.error(err.message, 'No se pudo cambiar la contraseña');
        this.cd.detectChanges();
      }
    });
  }

  // Para los mensajes de error de los templates.
  invalido(form: FormGroup, campo: string): boolean {
    const c = form.get(campo);
    return !!c && c.invalid && c.touched;
  }
}
