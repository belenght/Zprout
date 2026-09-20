import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TipoSemillaService } from '../../services/tipo-semilla.service';
import { CampoService } from '../../services/campo.service';
import { ProveedorService } from '../../services/proveedor.service';
import { TipoDeSemilla, Campo, Proveedor } from '../../interfaces/catalogos';

type Tab = 'semillas' | 'campos' | 'proveedores';

/**
 * Modulo "Catalogos": ABM de los 3 maestros que bloquean "Nuevo Lote"
 * (TipoDeSemilla, Campo, Proveedor) si estan vacios. No existe en los
 * wireframes originales (el mapa de navegacion asume datos precargados);
 * se agrega para que el alta de estos catalogos no dependa de un seed o de
 * pegarle a la API a mano.
 */
@Component({
  selector: 'app-catalogos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogos.component.html',
  styleUrl: './catalogos.component.css'
})
export class CatalogosComponent implements OnInit {
  tabActiva: Tab = 'semillas';
  cargando = true;
  errorMessage: string | null = null;

  // --- TipoDeSemilla ---
  tiposSemilla: TipoDeSemilla[] = [];
  formSemilla: FormGroup;
  editandoSemillaId: number | null = null;

  // --- Campo ---
  campos: Campo[] = [];
  formCampo: FormGroup;
  editandoCampoId: number | null = null;

  // --- Proveedor ---
  proveedores: Proveedor[] = [];
  formProveedor: FormGroup;
  editandoProveedorId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private tipoSemillaService: TipoSemillaService,
    private campoService: CampoService,
    private proveedorService: ProveedorService,
    private toastr: ToastrService
  ) {
    this.formSemilla = this.fb.group({
      nombre_semilla: ['', Validators.required],
      variante_semilla: ['', Validators.required],
      humedad_min: [null],
      humedad_max: [null],
      poder_germinativo_min: [null],
      poder_germinativo_max: [null],
      nivel_pureza_min: [null],
      nivel_pureza_max: [null],
      duracion: [''],
    });

    this.formCampo = this.fb.group({
      nro_campo: ['', Validators.required],
      ubicacion: ['', Validators.required],
    });

    this.formProveedor = this.fb.group({
      razon_social: ['', Validators.required],
      cuit: [''],
      contacto: [''],
    });
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cambiarTab(tab: Tab): void {
    this.tabActiva = tab;
  }

  private cargarTodo(): void {
    this.cargando = true;
    this.errorMessage = null;

    this.tipoSemillaService.getTiposSemilla().subscribe({
      next: (data) => (this.tiposSemilla = data),
      error: (err) => (this.errorMessage = `Error al cargar tipos de semilla: ${err.message}`)
    });
    this.campoService.getCampos().subscribe({
      next: (data) => (this.campos = data),
      error: (err) => (this.errorMessage = `Error al cargar campos: ${err.message}`)
    });
    this.proveedorService.getProveedores().subscribe({
      next: (data) => {
        this.proveedores = data;
        this.cargando = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar proveedores: ${err.message}`;
        this.cargando = false;
      }
    });
  }

  // ==================== TipoDeSemilla ====================

  editarSemilla(t: TipoDeSemilla): void {
    this.editandoSemillaId = t.id_semilla ?? null;
    this.formSemilla.patchValue(t);
  }

  cancelarEdicionSemilla(): void {
    this.editandoSemillaId = null;
    this.formSemilla.reset();
  }

  guardarSemilla(): void {
    if (this.formSemilla.invalid) {
      this.formSemilla.markAllAsTouched();
      return;
    }
    const valores = this.formSemilla.value;
    const idEditando = this.editandoSemillaId;

    const obs = idEditando
      ? this.tipoSemillaService.actualizarTipoSemilla(idEditando, valores)
      : this.tipoSemillaService.crearTipoSemilla(valores);

    obs.subscribe({
      next: (resultado) => {
        // Actualiza el array local con la respuesta del POST/PUT en vez de
        // volver a pedir la lista completa: evita el reintento HTTP extra
        // que a veces no llegaba a reflejarse hasta un F5.
        if (idEditando) {
          this.tiposSemilla = this.tiposSemilla.map((t) => (t.id_semilla === idEditando ? resultado : t));
        } else {
          this.tiposSemilla = [...this.tiposSemilla, resultado];
        }
        this.toastr.success('Tipo de semilla guardado', 'Listo');
        this.cancelarEdicionSemilla();
      },
      error: (err) => this.toastr.error(err.message, 'Error al guardar')
    });
  }

  eliminarSemilla(t: TipoDeSemilla): void {
    if (!t.id_semilla || !confirm(`¿Eliminar "${t.nombre_semilla} / ${t.variante_semilla}"?`)) return;
    this.tipoSemillaService.eliminarTipoSemilla(t.id_semilla).subscribe({
      next: () => {
        this.tiposSemilla = this.tiposSemilla.filter((x) => x.id_semilla !== t.id_semilla);
        this.toastr.success('Tipo de semilla eliminado', 'Listo');
      },
      error: (err) => this.toastr.error(err.message, 'Error al eliminar')
    });
  }

  // ==================== Campo ====================

  editarCampo(c: Campo): void {
    this.editandoCampoId = c.id_campo ?? null;
    this.formCampo.patchValue(c);
  }

  cancelarEdicionCampo(): void {
    this.editandoCampoId = null;
    this.formCampo.reset();
  }

  guardarCampo(): void {
    if (this.formCampo.invalid) {
      this.formCampo.markAllAsTouched();
      return;
    }
    const valores = this.formCampo.value;
    const idEditando = this.editandoCampoId;

    const obs = idEditando
      ? this.campoService.actualizarCampo(idEditando, valores)
      : this.campoService.crearCampo(valores);

    obs.subscribe({
      next: (resultado) => {
        if (idEditando) {
          this.campos = this.campos.map((c) => (c.id_campo === idEditando ? resultado : c));
        } else {
          this.campos = [...this.campos, resultado];
        }
        this.toastr.success('Campo guardado', 'Listo');
        this.cancelarEdicionCampo();
      },
      error: (err) => this.toastr.error(err.message, 'Error al guardar')
    });
  }

  eliminarCampo(c: Campo): void {
    if (!c.id_campo || !confirm(`¿Eliminar el campo "${c.nro_campo}"?`)) return;
    this.campoService.eliminarCampo(c.id_campo).subscribe({
      next: () => {
        this.campos = this.campos.filter((x) => x.id_campo !== c.id_campo);
        this.toastr.success('Campo eliminado', 'Listo');
      },
      error: (err) => this.toastr.error(err.message, 'Error al eliminar')
    });
  }

  // ==================== Proveedor ====================

  editarProveedor(p: Proveedor): void {
    this.editandoProveedorId = p.id_proveedor ?? null;
    this.formProveedor.patchValue(p);
  }

  cancelarEdicionProveedor(): void {
    this.editandoProveedorId = null;
    this.formProveedor.reset();
  }

  guardarProveedor(): void {
    if (this.formProveedor.invalid) {
      this.formProveedor.markAllAsTouched();
      return;
    }
    const valores = this.formProveedor.value;
    const idEditando = this.editandoProveedorId;

    const obs = idEditando
      ? this.proveedorService.actualizarProveedor(idEditando, valores)
      : this.proveedorService.crearProveedor(valores);

    obs.subscribe({
      next: (resultado) => {
        if (idEditando) {
          this.proveedores = this.proveedores.map((p) => (p.id_proveedor === idEditando ? resultado : p));
        } else {
          this.proveedores = [...this.proveedores, resultado];
        }
        this.toastr.success('Proveedor guardado', 'Listo');
        this.cancelarEdicionProveedor();
      },
      error: (err) => this.toastr.error(err.message, 'Error al guardar')
    });
  }

  eliminarProveedor(p: Proveedor): void {
    if (!p.id_proveedor || !confirm(`¿Eliminar el proveedor "${p.razon_social}"?`)) return;
    this.proveedorService.eliminarProveedor(p.id_proveedor).subscribe({
      next: () => {
        this.proveedores = this.proveedores.filter((x) => x.id_proveedor !== p.id_proveedor);
        this.toastr.success('Proveedor eliminado', 'Listo');
      },
      error: (err) => this.toastr.error(err.message, 'Error al eliminar')
    });
  }
}