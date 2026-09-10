import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../../features/auth/services/auth.service';

/**
 * Interceptor funcional que centraliza el manejo de errores http.
 * Asi cada service de feature (lote, pedido, etc) no repite try/catch.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // El backend devuelve { error: '...' } (ver cualquier controller), no { message: '...' }.
      const mensaje = error.error?.error ?? error.error?.message ?? 'Ocurrio un error inesperado. Intenta nuevamente.';

      if (error.status === 401) {
        notification.error('Tu sesion expiro. Inicia sesion nuevamente.');
        auth.logout();
        router.navigate(['/login']);
      } else if (error.status === 0) {
        notification.error('No se pudo conectar con el servidor.');
      } else {
        notification.error(mensaje);
      }

      return throwError(() => error);
    })
  );
};
