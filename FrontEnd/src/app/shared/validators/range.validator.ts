import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TipoSemilla } from '../../features/tipo-semilla/models/tipo-semilla.model';

export interface ViolacionRango {
  campo: 'humedad' | 'poder_germinativo' | 'nivel_de_pureza';
  valor: number;
  min: number;
  max: number;
}

/**
 * Validador a nivel de FormGroup: compara los controles humedad, poder_germinativo
 * y nivel_de_pureza de un formulario de Control de Calidad contra los rangos
 * min/max definidos en el TipoSemilla del lote/partida bajo control.
 *
 * Uso tipico (en calidad-form, seccion D del brief):
 *
 *   this.form = this.fb.group({
 *     humedad: [0],
 *     poder_germinativo: [0],
 *     nivel_de_pureza: [0],
 *     ...
 *   }, { validators: rangoCalidadValidator(() => this.tipoSemillaSeleccionada()) });
 *
 * Se pasa una funcion (no el objeto directo) porque el tipo de semilla se
 * conoce recien despues de que el usuario elige el lote/partida; con una
 * funcion el validador siempre lee el valor mas actual sin tener que
 * reconstruir el validator cada vez que cambia la seleccion.
 *
 * Si fuera de rango, el error queda en la clave 'rangoCalidad' del FormGroup:
 *   form.errors?.['rangoCalidad'] as ViolacionRango[] | undefined
 */
export function rangoCalidadValidator(
  getTipoSemilla: () => TipoSemilla | null | undefined
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const tipoSemilla = getTipoSemilla();
    if (!tipoSemilla) {
      // Sin tipo de semilla seleccionado todavia no hay contra que comparar.
      return null;
    }

    const humedad = group.get('humedad')?.value;
    const poderGerminativo = group.get('poder_germinativo')?.value;
    const nivelPureza = group.get('nivel_de_pureza')?.value;

    const violaciones: ViolacionRango[] = [];

    if (esNumero(humedad) && fueraDeRango(humedad, tipoSemilla.humedad_min, tipoSemilla.humedad_max)) {
      violaciones.push({ campo: 'humedad', valor: humedad, min: tipoSemilla.humedad_min, max: tipoSemilla.humedad_max });
    }

    if (
      esNumero(poderGerminativo) &&
      fueraDeRango(poderGerminativo, tipoSemilla.poder_germinativo_min, tipoSemilla.poder_germinativo_max)
    ) {
      violaciones.push({
        campo: 'poder_germinativo',
        valor: poderGerminativo,
        min: tipoSemilla.poder_germinativo_min,
        max: tipoSemilla.poder_germinativo_max
      });
    }

    if (
      esNumero(nivelPureza) &&
      fueraDeRango(nivelPureza, tipoSemilla.nivel_pureza_min, tipoSemilla.nivel_pureza_max)
    ) {
      violaciones.push({
        campo: 'nivel_de_pureza',
        valor: nivelPureza,
        min: tipoSemilla.nivel_pureza_min,
        max: tipoSemilla.nivel_pureza_max
      });
    }

    return violaciones.length > 0 ? { rangoCalidad: violaciones } : null;
  };
}

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && !Number.isNaN(valor);
}

function fueraDeRango(valor: number, min: number, max: number): boolean {
  return valor < min || valor > max;
}

/** Traduce el nombre tecnico del campo a una etiqueta legible para mostrar en la UI. */
export function etiquetaCampoCalidad(campo: ViolacionRango['campo']): string {
  switch (campo) {
    case 'humedad':
      return 'Humedad';
    case 'poder_germinativo':
      return 'Poder germinativo';
    case 'nivel_de_pureza':
      return 'Pureza';
  }
}
