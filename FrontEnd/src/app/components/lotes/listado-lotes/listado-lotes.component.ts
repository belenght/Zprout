import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoteService } from '../../../services/lote.service';
import { Lote } from '../../../interfaces/lote';

@Component({
  selector: 'app-listado-lotes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './listado-lotes.component.html',
  styleUrl: './listado-lotes.component.css'
})
export class ListadoLotesComponent implements OnInit {
  lotes: Lote[] = [];
  cargando = true;
  errorMessage: string | null = null;

  constructor(private loteService: LoteService) {}

  ngOnInit(): void {
    this.getLotes();
  }

  getLotes(): void {
    this.cargando = true;
    this.loteService.getLotes().subscribe({
      next: (data) => {
        this.lotes = data;
        this.cargando = false;
        this.errorMessage = null;
      },
      error: (err) => {
        this.errorMessage = `Error al cargar los lotes: ${err.message}`;
        this.cargando = false;
      }
    });
  }
}
