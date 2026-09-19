import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface LotePorCurar {
  nro_lote: string;
  semilla_variedad: string;
  disponible_tn: string;
  estado_actual: string;
}

@Component({
  selector: 'app-curado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './curado.component.html',
  styleUrl: './curado.component.css'
})
export class CuradoComponent {
  // Datos de ejemplo (GUI-09/GUI-10). El backend ya tiene partida.controller.ts;
  // falta el service + la conexion real en el front.
  lotesParaCurar: LotePorCurar[] = [
    { nro_lote: 'L-2026-040', semilla_variedad: 'Maiz / AX882', disponible_tn: '22.3', estado_actual: 'Para curar' },
    { nro_lote: 'L-2026-037', semilla_variedad: 'Maiz / DK7210', disponible_tn: '18.0', estado_actual: 'Para curar' },
  ];

  get resumen() {
    return {
      lotesConEstimacion: this.lotesParaCurar.length,
      pendientesCurar: this.lotesParaCurar.length,
      enProceso: 0,
    };
  }
}
