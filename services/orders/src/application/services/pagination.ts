/**
 * Aplicación · Normalización de parámetros de paginación.
 */

/**
 * Ajusta página y tamaño a rangos válidos en lugar de fallar.
 * @returns Página ≥ 1 y tamaño entre 1 y `max` (por defecto `fallbackSize`).
 */
export function normalizePage(page: number | undefined, pageSize: number | undefined, fallbackSize = 10, max = 50) {
  return {
    page: Math.max(1, Math.floor(page ?? 1)),
    pageSize: Math.min(max, Math.max(1, Math.floor(pageSize ?? fallbackSize))),
  };
}
