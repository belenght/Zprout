import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Lote, LotePayload } from '../models/lote.model';

@Injectable({ providedIn: 'root' })
export class LoteService {
  private http = inject(HttpClient);
  // Ruta real: loteRouter montado en /api/lotes (ver app.ts)
  private readonly baseUrl = `${environment.apiUrl}/lotes`;

  // Estado compartido: cualquier componente que se suscriba a lotes$ ve
  // siempre la ultima lista cargada, sin tener que repetir el get().
  private lotesSubject = new BehaviorSubject<Lote[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);

  lotes$ = this.lotesSubject.asObservable();
  cargando$ = this.cargandoSubject.asObservable();

  /**
   * Trae el listado completo. GET /api/lotes no acepta filtros por query
   * (ver lote.controller.ts -> listarLotes): siempre devuelve todo, y el
   * filtrado por estado/busqueda se hace del lado del cliente (ver lote-list.ts).
   */
  cargarLotes(): void {
    this.cargandoSubject.next(true);

    this.http
      .get<Lote[]>(this.baseUrl)
      .pipe(
        tap((lotes) => this.lotesSubject.next(lotes)),
        finalize(() => this.cargandoSubject.next(false))
      )
      .subscribe();
  }

  getById(idLote: number): Observable<Lote> {
    return this.http.get<Lote>(`${this.baseUrl}/${idLote}`);
  }

  /**
   * Alta de un lote (CUU01). El backend es quien decide el estado inicial
   * ('Pendiente CC' si es propio, 'Para curar' si es externo con CC automatico).
   * NOTA: el backend no procesa archivos (no hay multer/multipart configurado),
   * asi que "informe_calidad_externo" viaja como texto (referencia/URL), no
   * como un adjunto real. Si mas adelante se quiere subir el archivo de
   * verdad, hay que agregar manejo de multipart en el backend primero.
   */
  crear(payload: LotePayload): Observable<Lote> {
    return this.http.post<Lote>(this.baseUrl, payload);
  }

  /** Snapshot sincronico util para validaciones (ej: volumen disponible en Curado). */
  get lotesActuales(): Lote[] {
    return this.lotesSubject.value;
  }
}
