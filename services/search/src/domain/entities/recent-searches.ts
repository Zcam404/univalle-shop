/**
 * Dominio · Agregado `RecentSearches`.
 *
 * Últimas búsquedas de un usuario, de la más reciente a la más antigua, sin
 * repetir y como máximo 20. Las usa el servicio de Recomendación para conocer
 * los intereses del usuario, y el frontend para sugerir búsquedas.
 */
import { normalizeText } from '../services/text-normalizer.js';

export interface RecentSearchEntry {
  text: string;
  at: Date;
}

export class RecentSearches {
  static readonly MAX_ENTRIES = 20;

  private constructor(
    readonly userId: string,
    private entries: RecentSearchEntry[],
  ) {}

  static empty(userId: string): RecentSearches {
    return new RecentSearches(userId, []);
  }

  static restore(userId: string, entries: RecentSearchEntry[]): RecentSearches {
    return new RecentSearches(userId, entries.map((e) => ({ ...e })));
  }

  get list(): readonly RecentSearchEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  /**
   * Registra una búsqueda. Si ya estaba (sin importar mayúsculas ni tildes),
   * sube al primer lugar en vez de repetirse.
   */
  record(text: string, at: Date): void {
    const clean = text.trim().slice(0, 100);
    const key = normalizeText(clean);
    if (!key) return;
    this.entries = [{ text: clean, at }, ...this.entries.filter((e) => normalizeText(e.text) !== key)].slice(
      0,
      RecentSearches.MAX_ENTRIES,
    );
  }

  clear(): void {
    this.entries = [];
  }
}
