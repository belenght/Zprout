import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { PartidaService } from '../../../services/partida.service';
import { Partida, RegistrarControlFinalPayload, ResultadoControlFinal } from '../../../interfaces/partida';
import { RangosFueraDeRango } from '../../../interfaces/control-calidad';

/**
 * GUI-12 - "Control de calidad final" + GUI-13 (confirmacion). CUU06.
 */
@Component({
  selector: 'app-registrar-control-final',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './registrar-control-final.component.html',
  styleUrl: './registrar-control-final.component.css'
})
export class RegistrarControlFinalComponent implements OnInit {
  form: FormGroup;
  partida: Partida | null = null;
  cargando = true;
  guardando = false;
  errorMessage: string | null = null;

  fueraDeRango: RangosFueraDeRango | null = null;
  resultado: ResultadoControlFinal | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private partidaService: PartidaService,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      humedad: [null, [Validators.required, Validators.min(0)]],
      poder_germinativo: [null, [Validators.required, Validators.min(0)]],
      nivel_de_pureza: [null, [Validators.required, Validators.min(0)]],
      cantidad_bolsas_20kg: [null, [Validators.min(0)]],
      fecha_envasado: [new Date().toISOString().slice(0, 10), Validators.required],
    });
  }

  ngOnInit(): void {
    const partidaId = Number(this.route.snapshot.paramMap.get('partidaId'));
    this.partidaService.getPartida(partidaId).subscribe({
      next: (partida) => {
        this.partida = partida;
        this.form.patchValue({ cantidad_bolsas_20kg: partida.cantidad_bolsas_20kg ?? null });
        this.cargando = false;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar la partida: ${err.message}`;
        this.cargando = false;
      }
    });
  }

  get nombreSemilla(): string {
    const ts = (this.partida?.lote as any)?.tipo_semilla;
    return ts?.nombre_semilla ? `${ts.nombre_semilla} / ${ts.variante_semilla}` : '';
  }

  get nroLote(): string {
    return (this.partida?.lote as any)?.nro_lote ?? '';
  }

  get loteId(): number | null {
    return (this.partida?.lote as any)?.id_lote ?? null;
  }

  registrar(confirmarNoApto = false): void {
    if (!confirmarNoApto && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.partida?.id_partida) return;

    const valores = this.form.value;
    const payload: RegistrarControlFinalPayload = {
      partida_id: this.partida.id_partida,
      humedad: valores.humedad,
      poder_germinativo: valores.poder_germinativo,
      nivel_de_pureza: valores.nivel_de_pureza,
      cantidad_bolsas_20kg: valores.cantidad_bolsas_20kg ?? undefined,
      fecha_envasado: valores.fecha_envasado || undefined,
      confirmar_no_apto: confirmarNoApto || undefined,
    };

    this.guardando = true;
    this.partidaService.registrarControlFinal(payload).subscribe({
      next: (resultado) => {
        this.guardando = false;
        this.fueraDeRango = null;
        this.resultado = resultado;
        if (resultado.informe_generado) {
          this.toastr.success('Informe de partida generado con exito', 'Registrado');
        } else {
          this.toastr.warning('La partida quedo registrada como No Apto', 'Rechazada');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        if (err.status === 409 && err.error?.fuera_de_rango) {
          this.fueraDeRango = err.error.rangos;
          this.toastr.warning(
            'Los parametros ingresados estan fuera de rango. Revisa los datos o confirma el rechazo.',
            'Fuera de rango'
          );
        } else {
          this.toastr.error(err.error?.error || err.message, 'Error al registrar el control final');
        }
      }
    });
  }

  corregirDatos(): void {
    this.fueraDeRango = null;
  }

  confirmarNoApto(): void {
    this.registrar(true);
  }
}
