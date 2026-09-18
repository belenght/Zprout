import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private authState = new BehaviorSubject<boolean>(this.isLoggedIn());
  authState$ = this.authState.asObservable();

  constructor() {}

  private isLoggedIn(): boolean {
    if (typeof window !== 'undefined' && sessionStorage) {
      return !!sessionStorage.getItem('token');
    }
    return false;
  }

  setAuthState(isAuthenticated: boolean): void {
    this.authState.next(isAuthenticated);
  }
}
