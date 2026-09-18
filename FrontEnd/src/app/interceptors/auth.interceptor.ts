import { HttpEvent, HttpInterceptorFn, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interceptor para agregar el token de autenticacion a las solicitudes HTTP.
// IMPORTANTE: a diferencia del proyecto de referencia, este SI esta registrado
// en app.config.ts (withInterceptors([authInterceptor])) - sin eso, el token
// nunca se adjunta solo y las rutas protegidas del backend fallan con 401.
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const token = sessionStorage.getItem('token');
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(cloned);
  }
  return next(req);
};
