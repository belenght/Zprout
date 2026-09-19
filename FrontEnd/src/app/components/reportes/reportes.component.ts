import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BarraPorEspecie {
  nombre: string;
  porcentaje: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.css'
})
export class ReportesComponent {
  // Datos de ejemplo (GUI-15). Este modulo no tiene entidad/controller propio
  // en el backend todavia (es agregacion de datos de otros modulos), asi que
  // hace falta definir esos endpoints antes de conectar esto de verdad.
  volumenProcesado = '112.3';
  merma = '6.1';
  poderGerminativoPromedio = '94';
  informesGenerados = 18;

  procesadoPorEspecie: BarraPorEspecie[] = [
    { nombre: 'Soja', porcentaje: 62 },
    { nombre: 'Maiz', porcentaje: 41 },
    { nombre: 'Girasol', porcentaje: 24 },
  ];
}
