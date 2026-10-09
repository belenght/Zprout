import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    // Evita que los avisos se apilen: maximo 3 a la vez, el mas viejo se descarta
    // al llegar uno nuevo y no se repite el mismo mensaje.
    provideToastr({ maxOpened: 3, autoDismiss: true, preventDuplicates: true, timeOut: 4000 }),
  ],
};
