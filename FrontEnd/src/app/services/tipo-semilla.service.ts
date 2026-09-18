import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { TipoDeSemilla } from '../interfaces/catalogos';
import { handleHttpError } from './base-http.service';

@Injectable({ providedIn: 'root' })
export class TipoSemillaService {
  private apiUrl = `${environment.apiUrl}/tipos-semilla`;

  constructor(private http: HttpClient) {}

  getTiposSemilla(): Observable<TipoDeSemilla[]> {
    return this.http.get<TipoDeSemilla[]>(this.apiUrl).pipe(catchError(handleHttpError));
  }
}
