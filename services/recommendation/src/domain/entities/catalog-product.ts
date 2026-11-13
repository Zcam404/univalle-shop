/**
 * Dominio · Entidad `CatalogProduct`.
 *
 * Copia local de un producto del Catálogo, con los datos que necesita el motor
 * de recomendación. Se mantiene al día leyendo el feed de cambios de Catálogo,
 * así se puede recomendar aunque Catálogo esté caído.
 */
import { normalizeText } from '../services/text-normalizer.js';

export interface CatalogProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string | null;
  categoryName: string;
  imageUrl: string | null;
  available: boolean;
  active: boolean;
  createdAt: Date;
}

export class CatalogProduct {
  /** Nombre, categoría y descripción normalizados juntos, para comparar con búsquedas. */
  readonly searchableText: string;

  private constructor(private readonly props: CatalogProductProps) {
    this.searchableText = normalizeText(`${props.name} ${props.categoryName} ${props.description}`);
  }

  static from(props: CatalogProductProps): CatalogProduct {
    return new CatalogProduct({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get categoryId(): string | null {
    return this.props.categoryId;
  }
  get categoryName(): string {
    return this.props.categoryName;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Se puede recomendar: activo y con stock. */
  get recommendable(): boolean {
    return this.props.active && this.props.available;
  }

  toPrimitives(): CatalogProductProps {
    return { ...this.props };
  }
}
