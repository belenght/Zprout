// Exportacion a CSV compatible con Excel (separador ";" y BOM UTF-8, asi se
// abre directo en Excel con configuracion regional de Argentina y respeta
// tildes). No requiere librerias.
export function exportarCsv(nombreArchivo: string, columnas: string[], filas: (string | number | null | undefined)[][]): void {
  const escapar = (v: string | number | null | undefined) => {
    let t = v === null || v === undefined ? '' : String(v);
    // Evita que Excel interprete el valor como formula (CSV injection).
    if (/^[=+\-@]/.test(t) && isNaN(Number(t))) t = `'${t}`;
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lineas = [columnas, ...filas].map((f) => f.map(escapar).join(';'));
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Fecha YYYY-MM-DD (sin desfase de zona horaria) para columnas de fecha.
export function fechaCsv(valor: string | Date | null | undefined): string {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
