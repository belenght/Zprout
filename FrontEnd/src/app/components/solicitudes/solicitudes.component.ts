import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { UsuarioService } from '../../services/usuario.service';
import { EstadoUsuario, RolRegistro, SolicitudUsuario } from '../../interfaces/login';
import { ROL_ADMIN, etiquetaRol } from '../../shared/roles';

/**
 * Solicitudes de cuenta (solo administrador). Muestra los usuarios
 * pendientes y rechazados; el admin acepta (confirmando o cambiando el rol
 * pedido), rechaza, o devuelve un rechazado a pendiente.
 */
@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.css'
})
export class SolicitudesComponent implements OnInit {
  tabActiva: Extract<EstadoUsuario, 'pendiente' | 'rechazado'> = 'pendiente';
  solicitudes: SolicitudUsuario[] = [];
  roles: RolRegistro[] = [];
  // id_usuario -> id_rol elegido en el select de esa fila
  rolElegido: Record<number, number | null> = {};

  cargando = true;
  procesandoId: number | null = null;
  errorMessage: string | null = null;
  etiquetaRol = etiquetaRol;

  // Fuerza el redibujado despues de cada subscribe: ver el mismo comentario
  // en listado-lotes.component.ts.
  private cd = inject(ChangeDetectorRef);

  constructor(private usuarioService: UsuarioService, private toastr: ToastrService) {}

  ngOnInit(): void {
    forkJoin({
      roles: this.usuarioService.getRolesAsignables(),
      solicitudes: this.usuarioService.getSolicitudes(this.tabActiva)
    }).subscribe({
      next: ({ roles, solicitudes }) => {
        // El admin no se asigna desde esta pantalla: es un rol de alta manual (seed).
        this.roles = roles.filter((r) => r.desc_rol !== ROL_ADMIN);
        this.aplicar(solicitudes);
      },
      error: (err) => this.fallo(err)
    });
  }

  cambiarTab(tab: 'pendiente' | 'rechazado'): void {
    this.tabActiva = tab;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.usuarioService.getSolicitudes(this.tabActiva).subscribe({
      next: (data) => this.aplicar(data),
      error: (err) => this.fallo(err)
    });
  }

  aprobar(s: SolicitudUsuario): void {
    const id_rol = this.rolElegido[s.id_usuario];
    if (!id_rol) {
      this.toastr.warning('Elegí un rol antes de aprobar', 'Falta el rol');
      return;
    }
    this.cambiar(s, 'activo', id_rol, `Cuenta de ${s.nombre} ${s.apellido} aprobada`);
  }

  rechazar(s: SolicitudUsuario): void {
    this.cambiar(s, 'rechazado', undefined, `Solicitud de ${s.nombre} ${s.apellido} rechazada`);
  }

  volverAPendiente(s: SolicitudUsuario): void {
    this.cambiar(s, 'pendiente', undefined, `${s.nombre} ${s.apellido} volvió a pendiente`);
  }

  private cambiar(s: SolicitudUsuario, estado: EstadoUsuario, id_rol: number | undefined, mensaje: string): void {
    this.procesandoId = s.id_usuario;
    this.usuarioService.cambiarEstado(s.id_usuario, estado, id_rol).subscribe({
      next: () => {
        this.procesandoId = null;
        this.toastr.success(mensaje);
        // Sale de la lista actual (cambio de estado): se quita sin recargar todo.
        this.solicitudes = this.solicitudes.filter((x) => x.id_usuario !== s.id_usuario);
        this.cd.detectChanges();
      },
      error: (err) => {
        this.procesandoId = null;
        this.toastr.error(err.message, 'No se pudo actualizar');
        this.cd.detectChanges();
      }
    });
  }

  private aplicar(data: SolicitudUsuario[]): void {
    this.solicitudes = data;
    this.rolElegido = {};
    for (const s of data) {
      // Preselecciona lo que pidio la persona (o el rol que ya tenia).
      this.rolElegido[s.id_usuario] = s.rol_solicitado?.id_rol ?? s.rol?.id_rol ?? null;
    }
    this.cargando = false;
    this.errorMessage = null;
    this.cd.detectChanges();
  }

  private fallo(err: Error): void {
    this.errorMessage = `Error al cargar las solicitudes: ${err.message}`;
    this.cargando = false;
    this.cd.detectChanges();
  }
}