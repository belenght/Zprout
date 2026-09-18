import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoteService } from '../../services/lote.service';
import { AuthService } from '../../services/auth.service';
import { Lote } from '../../interfaces/lote';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  nombreUsuario = '';
  ultimosLotes: Lote[] = [];
  cantidadLotesActivos = 0;
  cargando = true;
  errorMessage: string | null = null;

  constructor(private loteService: LoteService, private authService: AuthService) {}

  ngOnInit(): void {
    this.nombreUsuario = this.authService.getUserName() ?? '';
    this.cargarIndicadores();
  }

  cargarIndicadores(): void {
    this.cargando = true;
    this.loteService.getLotes().subscribe({
      next: (lotes) => {
        this.cantidadLotesActivos = lotes.length;
        this.ultimosLotes = lotes.slice(0, 5);
        this.cargando = false;
        this.errorMessage = null;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar el dashboard: ${err.message}`;
        this.cargando = false;
      }
    });
  }
}
