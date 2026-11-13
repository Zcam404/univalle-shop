/**
 * Dominio · Entidad `IndexedProduct`.
 *
 * Copia de un producto del Catálogo, preparada para buscar. Búsqueda nunca
 * modifica productos: solo refleja lo que Catálogo publica en su feed de
 * cambios. Los productos desactivados se guardan con `active: false` y no
 * aparecen en los resultados.
 */
import { SearchableText, searchableText } from '../services/relevance.js';

export interface IndexedProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string | null;
  categoryName: string;
  imageUrl: string | null;
  stock: number;
  available: boolean;
  active: boolean;
  /** Fecha de creación en Catálogo (para ordenar por "más nuevos"). */
  createdAt: Date;
}

export class IndexedProduct {
  private constructor(
    private readonly props: IndexedProductProps,
    readonly text: SearchableText,
  ) {}

  /** Crea la copia indexada y calcula sus textos normalizados. */
  static from(props: IndexedProductProps): IndexedProduct {
    return new IndexedProduct({ ...props }, searchableText(props.name, props.categoryName, props.description));
  }

  get id(): string {
    return this.props.id;
  }
  get price(): number {
    return this.props.price;
  }
  get active(): boolean {
    return this.props.active;
  }
  get available(): boolean {
    return this.props.available;
  }
  get categoryId(): string | null {
    return this.props.categoryId;
  }
  get name(): string {
    return this.props.name;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPrimitives(): IndexedProductProps {
    return { ...this.props };
  }
}
