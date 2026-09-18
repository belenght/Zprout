import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

// Manejo de errores centralizado, reusado por todos los services de recurso.
// Mismo criterio que MateriaService del proyecto de referencia, sacado a una
// funcion aparte para no repetirlo en cada uno de los ~10 services de Zprout.
export function handleHttpError(error: HttpErrorResponse): Observable<never> {
  let errorMessage = 'Error desconocido';

  if (error.status === 0) {
    errorMessage = `Error de red: ${error.message}`;
  } else {
    switch (error.status) {
      case 400:
        errorMessage = error.error?.error || 'Solicitud invalida. Verifica los datos ingresados.';
        break;
      case 401:
        errorMessage = 'Credenciales invalidas o sesion expirada.';
        break;
      case 404:
        errorMessage = error.error?.error || 'Recurso no encontrado.';
        break;
      case 409:
        errorMessage = error.error?.error || 'Conflicto al procesar la solicitud.';
        break;
      default:
        errorMessage = error.error?.error || `Ocurrio un error inesperado: ${error.message}`;
        break;
    }
  }
  return throwError(() => new Error(errorMessage));
}
