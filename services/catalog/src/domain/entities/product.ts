/**
 * Dominio · Entidad `Product`.
 *
 * Producto que se vende en la tienda. Reglas que protege:
 * - nombre entre 2 y 120 caracteres; descripción de hasta 2000;
 * - precio entero positivo en pesos (ver `Price`);
 * - entre 0 y 8 imágenes, todas con URL http(s);
 * - stock entero y nunca negativo;
 * - los productos no se borran: se desactivan, para no romper pedidos antiguos.
 *
 * El stock NO se cambia con métodos de esta entidad: varias compras pueden
 * ocurrir a la vez, así que el repositorio lo modifica de forma atómica en la
 * base de datos (ver `ProductRepository.adjustStock`). Aquí solo se valida el
 * stock inicial.
 */
import { InvalidProductError } from '../errors/catalog.errors.js';
import { Price } from '../value-objects/price.js';

/** Datos editables de un producto. */
export interface ProductData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  images: string[];
}

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: Price;
  categoryId: string;
  images: string[];
  stock: number;
  active: boolean;
  createdAt: Date;
  /** Última modificación; la mantiene la base de datos en cada escritura. */
  updatedAt: Date;
}

export class Product {
  static readonly MAX_IMAGES = 8;

  private constructor(private props: ProductProps) {}

  /**
   * Crea un producto activo.
   *
   * @param initialStock Unidades disponibles al crearlo (entero ≥ 0).
   * @throws InvalidProductError Si algún dato no cumple las reglas.
   */
  static create(id: string, data: ProductData, initialStock: number, now: Date): Product {
    if (!Number.isInteger(initialStock) || initialStock < 0) {
      throw new InvalidProductError('El stock inicial debe ser un número entero mayor o igual a cero.');
    }
    return new Product({
      id,
      ...Product.validate(data),
      stock: initialStock,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruye un producto desde la persistencia, sin volver a validarlo. */
  static restore(props: ProductProps): Product {
    return new Product({ ...props, images: [...props.images] });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string {
    return this.props.description;
  }
  get price(): Price {
    return this.props.price;
  }
  get categoryId(): string {
    return this.props.categoryId;
  }
  get images(): readonly string[] {
    return [...this.props.images];
  }
  get stock(): number {
    return this.props.stock;
  }
  get active(): boolean {
    return this.props.active;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Indica si un cliente puede comprarlo ahora: activo y con al menos una unidad. */
  get isPurchasable(): boolean {
    return this.props.active && this.props.stock > 0;
  }

  /**
   * Cambia los datos indicados y valida el resultado completo.
   * @throws InvalidProductError Si el resultado no es válido.
   */
  update(changes: Partial<ProductData>): void {
    const current: ProductData = {
      name: this.props.name,
      description: this.props.description,
      price: this.props.price.amount,
      categoryId: this.props.categoryId,
      images: this.props.images,
    };
    const merged = { ...current, ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)) };
    Object.assign(this.props, Product.validate(merged as ProductData));
  }

  /** Activa o desactiva el producto. Desactivado no aparece para los clientes ni se puede comprar. */
  setActive(active: boolean): void {
    this.props.active = active;
  }

  /** Valida y limpia los datos editables. */
  private static validate(data: ProductData): Omit<ProductProps, 'id' | 'stock' | 'active' | 'createdAt' | 'updatedAt'> {
    const name = data.name.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 120) {
      throw new InvalidProductError('El nombre del producto debe tener entre 2 y 120 caracteres.');
    }
    const description = data.description.trim();
    if (description.length > 2000) {
      throw new InvalidProductError('La descripción no puede superar los 2000 caracteres.');
    }
    const categoryId = data.categoryId.trim();
    if (!categoryId) throw new InvalidProductError('El producto debe tener una categoría.');

    if (data.images.length > Product.MAX_IMAGES) {
      throw new InvalidProductError(`Un producto puede tener como máximo ${Product.MAX_IMAGES} imágenes.`);
    }
    const images = data.images.map((url) => url.trim());
    for (const url of images) {
      if (!Product.isHttpUrl(url) || url.length > 500) {
        throw new InvalidProductError(`La imagen "${url}" no es una URL http(s) válida.`);
      }
    }

    return { name, description, price: Price.of(data.price), categoryId, images };
  }

  /** Comprueba que el texto sea una URL que empiece por http:// o https://. */
  private static isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
