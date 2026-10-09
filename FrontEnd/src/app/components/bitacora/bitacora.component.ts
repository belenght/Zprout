import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BitacoraService } from '../../services/extras.service';
import { RegistroBitacora } from '../../interfaces/extras';
import { exportarCsv } from '../../shared/exportar-csv';

const ETIQUETAS: Record<string, string> = {
  'usuario.editar': 'Edición de usuario',
  'usuario.password': 'Restablecimiento de contraseña',
  'usuario.eliminar': 'Eliminación de usuario',
  'solicitud.aprobar': 'Solicitud aprobada',
  'solicitud.rechazar': 'Solicitud rechazada',
  'solicitud.pendiente': 'Solicitud devuelta a pendiente',
  'lote.destino': 'Destino de lote no apto',
};

/**
 * Bitacora de administracion (solo administrador): quien hizo que cambio
 * sensible sobre cuentas de usuario y decisiones sobre lotes no aptos.
 */
@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bitacora.component.html',
})
export class BitacoraComponent implements OnInit {
  private cd = inject(ChangeDetectorRef);

  registros: RegistroBitacora[] = [];
  cargando = true;
  errorMessage: string | null = null;

  filtroAccion = '';
  filtroUsuario = '';

  readonly acciones = Object.entries(ETIQUETAS).map(([valor, etiqueta]) => ({ valor, etiqueta }));

  constructor(private service: BitacoraService) {}

  ngOnInit(): void {
    this.cargar();
  }

  etiqueta(accion: string): string {
    return ETIQUETAS[accion] ?? accion;
  }

  cargar(): void {
    this.cargando = true;
    this.errorMessage = null;
    this.service.getRegistros({ accion: this.filtroAccion || undefined, usuario: this.filtroUsuario.trim() || undefined, limite: 500 }).subscribe({
      next: (r) => {
        this.registros = r;
        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.message;
        this.cargando = false;
        this.cd.detectChanges();
      },
    });
  }

  limpiar(): void {
    this.filtroAccion = '';
    this.filtroUsuario = '';
    this.cargar();
  }

  exportar(): void {
    exportarCsv(
      'bitacora',
      ['Fecha', 'Usuario', 'Acción', 'Objetivo', 'Detalle'],
      this.registros.map((r) => [new Date(r.fecha).toLocaleString('es-AR'), r.usuario_actor, this.etiqueta(r.accion), r.objetivo, r.detalle]),
    );
  }
}
