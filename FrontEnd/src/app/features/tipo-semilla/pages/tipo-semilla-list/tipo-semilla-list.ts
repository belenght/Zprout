import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { TipoSemillaService } from '../../services/tipo-semilla.service';
import { TipoSemilla } from '../../models/tipo-semilla.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-tipo-semilla-list',
  standalone: true,
  imports: [RouterLink, MatTableModule, MatButtonModule, MatIconModule, LoadingSpinnerComponent],
  templateUrl: './tipo-semilla-list.html',
  styleUrl: './tipo-semilla-list.css'
})
export class TipoSemillaListComponent implements OnInit {
  private service = inject(TipoSemillaService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);

  columnas = ['id_semilla', 'nombre_semilla', 'variante_semilla', 'acciones'];
  items = signal<TipoSemilla[]>([]);
  cargando = signal(true);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.service.getAll().subscribe({
      next: (data) => {
        this.items.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  eliminar(item: TipoSemilla): void {
    const data: ConfirmDialogData = {
      titulo: 'Eliminar tiposemilla',
      mensaje: `Seguro que queres eliminar "${item.nombre_semilla} - ${item.variante_semilla}"?`
    };

    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;

      this.service.delete(item.id_semilla).subscribe(() => {
        this.notification.success('Eliminado correctamente');
        this.cargar();
      });
    });
  }
}
