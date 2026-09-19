import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StockVariedad {
  semilla: string;
  variedad: string;
  aPortar: string;
  disponible: string;
  estado: 'Disponible' | 'Sin stock';
}

interface UnidadAlmacen {
  nombre: string;
  ocupado_tn: string;
  capacidad_tn: string;
}

@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './almacen.component.html',
  styleUrl: './almacen.component.css'
})
export class AlmacenComponent {
  // Datos de ejemplo (GUI-13). El backend ya tiene almacen.controller.ts;
  // falta el service + la conexion real en el front.
  unidades: UnidadAlmacen[] = [
    { nombre: 'Silo A', ocupado_tn: '42', capacidad_tn: '60' },
    { nombre: 'Galpon 1', ocupado_tn: '18', capacidad_tn: '30' },
  ];

  stockPorVariedad: StockVariedad[] = [
    { semilla: 'Soja', variedad: 'DM 4670', aPortar: '—', disponible: '18.2 tn', estado: 'Disponible' },
    { semilla: 'Maiz', variedad: 'AX882', aPortar: '—', disponible: '0 tn', estado: 'Sin stock' },
    { semilla: 'Girasol', variedad: 'Paraiso 20', aPortar: '—', disponible: '8.0 tn', estado: 'Disponible' },
  ];
}
