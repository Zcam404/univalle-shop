/**
 * Dominio · Entidad `Category`.
 *
 * Agrupa productos (ej. "Papelería", "Ropa Univalle"). El nombre es único sin
 * importar mayúsculas ni tildes: para eso se calcula una `nameKey` normalizada.
 */
import { InvalidCategoryError } from '../errors/catalog.errors.js';

export interface CategoryProps {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export class Category {
  private constructor(private props: CategoryProps) {}

  /**
   * Crea una categoría validando nombre y descripción.
   *
   * @throws InvalidCategoryError Si el nombre tiene menos de 2 o más de 60 caracteres,
   *   o la descripción supera los 300.
   */
  static create(id: string, name: string, description: string | null | undefined, createdAt: Date): Category {
    return new Category({
      id,
      name: Category.validateName(name),
      description: Category.validateDescription(description),
      createdAt,
    });
  }

  /** Reconstruye una categoría desde la persistencia, sin volver a validarla. */
  static restore(props: CategoryProps): Category {
    return new Category({ ...props });
  }

  /**
   * Convierte un nombre en su clave de comparación: minúsculas, sin tildes y
   * con espacios simples. "Ropa  Univallé" y "ropa univalle" dan la misma clave.
   */
  static keyOf(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get nameKey(): string {
    return Category.keyOf(this.props.name);
  }
  get description(): string | null {
    return this.props.description;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * Cambia nombre y/o descripción.
   * @throws InvalidCategoryError Si los datos no son válidos.
   */
  update(changes: { name?: string; description?: string | null }): void {
    if (changes.name !== undefined) this.props.name = Category.validateName(changes.name);
    if (changes.description !== undefined) this.props.description = Category.validateDescription(changes.description);
  }

  private static validateName(name: string): string {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2 || trimmed.length > 60) {
      throw new InvalidCategoryError('El nombre de la categoría debe tener entre 2 y 60 caracteres.');
    }
    return trimmed;
  }

  private static validateDescription(description: string | null | undefined): string | null {
    const trimmed = description?.trim() || null;
    if (trimmed && trimmed.length > 300) {
      throw new InvalidCategoryError('La descripción de la categoría no puede superar los 300 caracteres.');
    }
    return trimmed;
  }
}
