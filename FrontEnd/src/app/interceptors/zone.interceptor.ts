import { inject, NgZone } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Fuerza que cada evento de la respuesta HTTP (next/error/complete) corra
 * dentro de NgZone.run(), sin importar en que zona haya resuelto realmente
 * la peticion subyacente (XHR/fetch).
 *
 * Por que hace falta: en teoria zone.js parchea XMLHttpRequest/fetch al
 * arrancar la app, y HttpClient corre naturalmente dentro de NgZone. Pero
 * algunas extensiones del browser (bloqueadores de tracking/fingerprinting,
 * como los shields de Brave) tambien parchean esas mismas APIs para sus
 * propios fines, y pueden terminar resolviendo la promesa/observable FUERA
 * de la zona de Angular. Cuando eso pasa, el subscribe de un componente
 * SI actualiza sus variables (this.lotes = data), pero Angular nunca se
 * entera y no corre change detection - la vista queda vieja hasta que
 * cualquier evento nativo (un click, cambiar de tab) dispare un ciclo de
 * CD "de arrastre" que recien ahi levanta el dato ya cargado. Sintoma:
 * "la grilla no se actualiza sola, pero si interactuo con la pagina
 * aparece".
 *
 * Este interceptor es la forma centralizada de blindarse contra eso: no
 * depende de que el parcheo de zone.js haya funcionado, fuerza la reentrada
 * a mano en el unico punto por el que pasan todas las respuestas HTTP de la
 * app.
 */
export const zoneInterceptor: HttpInterceptorFn = (req, next) => {
  const zone = inject(NgZone);

  return new Observable((subscriber) => {
    const subscription = next(req).subscribe({
      next: (event) => zone.run(() => subscriber.next(event)),
      error: (err) => zone.run(() => subscriber.error(err)),
      complete: () => zone.run(() => subscriber.complete()),
    });
    return () => subscription.unsubscribe();
  });
};
