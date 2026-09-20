import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoteService } from '../../../services/lote.service';
import { CampoService } from '../../../services/campo.service';
import { ProveedorService } from '../../../services/proveedor.service';
import { TipoSemillaService } from '../../../services/tipo-semilla.service';
import { Campo, Proveedor, TipoDeSemilla } from '../../../interfaces/catalogos';
import { NuevoLotePayload, OrigenSemilla } from '../../../interfaces/lote';

@Component({
  selector: 'app-nuevo-lote',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './nuevo-lote.component.html',
  styleUrl: './nuevo-lote.component.css'
})
export class NuevoLoteComponent implements OnInit {
  form: FormGroup;
  campos: Campo[] = [];
  proveedores: Proveedor[] = [];
  tiposSemilla: TipoDeSemilla[] = [];
  guardando = false;

  // Fuerza el redibujado justo despues de cada subscribe: ver el mismo
  // comentario en listado-lotes.component.ts. Este componente es el de
  // la captura donde "Cultivo/Variedad" se veia vacio: los 3 catalogos
  // se cargan en paralelo en ngOnInit exactamente con este patron.
  private cd = inject(ChangeDetectorRef);

  constructor(
    private fb: FormBuilder,
    private loteService: LoteService,
    private campoService: CampoService,
    private proveedorService: ProveedorService,
    private tipoSemillaService: TipoSemillaService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      origen_semilla: ['propio' as OrigenSemilla, Validators.required],
      tipo_semilla_id: [null, Validators.required],
      cantidad_semillas_en_tn: [null, [Validators.required, Validators.min(0.01)]],
      campo_id: [null],
      proveedor_id: [null],
      informe_calidad_externo: [''],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.tipoSemillaService.getTiposSemilla().subscribe({
      next: (data) => {
        this.tiposSemilla = data;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.toastr.error('No se pudieron cargar los tipos de semilla', 'Error');
        this.cd.detectChanges();
      }
    });
    this.campoService.getCampos().subscribe({
      next: (data) => {
        this.campos = data;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.toastr.error('No se pudieron cargar los campos', 'Error');
        this.cd.detectChanges();
      }
    });
    this.proveedorService.getProveedores().subscribe({
      next: (data) => {
        this.proveedores = data;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.toastr.error('No se pudieron cargar los proveedores', 'Error');
        this.cd.detectChanges();
      }
    });

    this.aplicarValidacionesPorOrigen(this.form.value.origen_semilla);
    this.form.get('origen_semilla')?.valueChanges.subscribe((origen) => {
      this.aplicarValidacionesPorOrigen(origen);
    });
  }

  get esExterno(): boolean {
    return this.form.get('origen_semilla')?.value === 'externo';
  }

  private aplicarValidacionesPorOrigen(origen: OrigenSemilla): void {
    const campoCtrl = this.form.get('campo_id');
    const proveedorCtrl = this.form.get('proveedor_id');

    if (origen === 'propio') {
      campoCtrl?.setValidators([Validators.required]);
      proveedorCtrl?.clearValidators();
      proveedorCtrl?.setValue(null);
    } else {
      proveedorCtrl?.setValidators([Validators.required]);
      campoCtrl?.clearValidators();
      campoCtrl?.setValue(null);
    }
    campoCtrl?.updateValueAndValidity();
    proveedorCtrl?.updateValueAndValidity();
  }

  registrarIngreso(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.value;
    const payload: NuevoLotePayload = {
      tipo_semilla_id: valores.tipo_semilla_id,
      cantidad_semillas_en_tn: valores.cantidad_semillas_en_tn,
      origen_semilla: valores.origen_semilla,
      observaciones: valores.observaciones || undefined,
    };

    if (valores.origen_semilla === 'propio') {
      payload.campo_id = valores.campo_id;
    } else {
      payload.proveedor_id = valores.proveedor_id;
      payload.informe_calidad_externo = valores.informe_calidad_externo || undefined;
    }

    this.guardando = true;
    this.loteService.registrarIngreso(payload).subscribe({
      next: (lote) => {
        this.guardando = false;
        this.toastr.success(`Lote ${lote.nro_lote} registrado con exito`, 'Ingreso registrado');
        this.cd.detectChanges();
        this.router.navigate(['/lotes']);
      },
      error: (err) => {
        this.guardando = false;
        this.toastr.error(err.message, 'Error al registrar el ingreso');
        this.cd.detectChanges();
      }
    });
  }
}