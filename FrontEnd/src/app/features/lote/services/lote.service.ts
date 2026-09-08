import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Lote, LotePayload } from '../models/lote.model';

@Injectable({ providedIn: 'root' })
export class LoteService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/lote`;

  // Estado compartido: cualquier componente que se suscriba a lotes$ ve
  // siempre la ultima lista cargada, sin tener que repetir el get().
  private lotesSubject = new BehaviorSubject<Lote[]>([]);
  private cargandoSubject = new BehaviorSubject<boolean>(false);

  lotes$ = this.lotesSubject.asObservable();
  cargando$ = this.cargandoSubject.asObservable();

  /**
   * Trae el listado completo y actualiza lotes$.
   * @param estado filtro rapido por nombre de estado (ej: 'Pendiente CC'). Opcional.
   * @param busqueda texto libre (nro de lote, descripcion, etc). Opcional.
   */
  cargarLotes(estado?: string, busqueda?: string): void {
    this.cargandoSubject.next(true);

    let params = new HttpParams();
    if (estado && estado !== 'Todos') params = params.set('estado', estado);
    if (busqueda) params = params.set('q', busqueda);

    this.http
      .get<Lote[]>(this.baseUrl, { params })
      .pipe(
        tap((lotes) => this.lotesSubject.next(lotes)),
        finalize(() => this.cargandoSubject.next(false))
      )
      .subscribe();
  }

  getById(nroLote: number): Observable<Lote> {
    return this.http.get<Lote>(`${this.baseUrl}/${nroLote}`);
  }

  /**
   * Alta de un lote. El backend es quien decide el estado inicial
   * ('Pendiente CC' si es Propio, salteo directo a stock curado si es Externo
   *  segun la regla de negocio descripta en el modulo de Lotes).
   */
  crear(payload: LotePayload, informeCalidadProveedor?: File | null): Observable<Lote> {
    if (payload.origen_semilla === 'Externo' && informeCalidadProveedor) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      formData.append('informe_calidad', informeCalidadProveedor);
      return this.http.post<Lote>(this.baseUrl, formData);
    }

    return this.http.post<Lote>(this.baseUrl, payload);
  }

  actualizar(nroLote: number, payload: Partial<LotePayload>): Observable<Lote> {
    return this.http.put<Lote>(`${this.baseUrl}/${nroLote}`, payload);
  }

  eliminar(nroLote: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${nroLote}`);
  }

  /** Snapshot sincronico util para validaciones (ej: volumen disponible en Curado). */
  get lotesActuales(): Lote[] {
    return this.lotesSubject.value;
  }
}
