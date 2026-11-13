/**
 * Dominio · Normalización de texto para buscar.
 *
 * Tanto los productos como lo que escribe el usuario pasan por aquí, así
 * "Café", "cafe" y "CAFÉ" quedan iguales: minúsculas, sin tildes ni signos y
 * con espacios simples.
 */

/** Convierte un texto a su forma comparable. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes y diéresis (la ñ pasa a n)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // signos de puntuación → espacio
    .trim();
}

/**
 * Divide la búsqueda en términos útiles: normalizados, sin repetir, de al
 * menos 2 caracteres y como máximo 6 (para que una búsqueda muy larga no
 * vuelva lenta la consulta).
 */
export function toSearchTerms(text: string): string[] {
  const words = normalizeText(text)
    .split(' ')
    .filter((w) => w.length >= 2);
  return [...new Set(words)].slice(0, 6);
}
