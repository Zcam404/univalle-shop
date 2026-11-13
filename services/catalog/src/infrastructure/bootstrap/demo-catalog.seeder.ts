/**
 * Infraestructura · Datos de ejemplo del catálogo.
 *
 * Si `SEED_DEMO_DATA=true` y no hay ninguna categoría, al arrancar crea
 * categorías y productos de ejemplo usando los mismos casos de uso que el
 * administrador. Sirve para tener una tienda con contenido en desarrollo.
 */
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CREATE_CATEGORY, LIST_CATEGORIES } from '../../application/ports/in/category.ports.js';
import type { CreateCategoryPort, ListCategoriesPort } from '../../application/ports/in/category.ports.js';
import { CREATE_PRODUCT } from '../../application/ports/in/product.ports.js';
import type { CreateProductPort } from '../../application/ports/in/product.ports.js';
import { CATALOG_CONFIG } from '../config/catalog.config.js';
import type { CatalogConfig } from '../config/catalog.config.js';

/** Imagen de ejemplo estable para cada producto (servicio público de imágenes de prueba). */
const image = (seed: string) => `https://picsum.photos/seed/univalle-${seed}/600/600`;

/** Catálogo de ejemplo: categoría → productos [nombre, descripción, precio, stock]. */
const DEMO: Record<string, { description: string; products: [string, string, number, number][] }> = {
  'Ropa Univalle': {
    description: 'Prendas oficiales de la Universidad del Valle',
    products: [
      ['Buzo con capucha Univalle', 'Buzo gris con el escudo bordado. Algodón perchado.', 85000, 25],
      ['Camiseta Univalle roja', 'Camiseta 100% algodón con el logo institucional.', 35000, 40],
      ['Gorra Univalle', 'Gorra ajustable con bordado del escudo.', 28000, 15],
    ],
  },
  Papelería: {
    description: 'Cuadernos, agendas y útiles de estudio',
    products: [
      ['Cuaderno argollado Univalle', 'Cuaderno de 100 hojas cuadriculadas, tapa dura.', 12000, 100],
      ['Agenda 2026 Univalle', 'Agenda semanal con calendario académico.', 30000, 30],
      ['Kit de lapiceros', 'Tres lapiceros de tinta negra, azul y roja.', 6500, 80],
    ],
  },
  Accesorios: {
    description: 'Termos, mochilas y recuerdos',
    products: [
      ['Termo Univalle 750 ml', 'Termo de acero inoxidable que conserva la temperatura 12 horas.', 45000, 20],
      ['Mochila Univalle', 'Mochila con compartimento acolchado para portátil de 15".', 120000, 10],
      ['Mug Univalle', 'Mug de cerámica de 11 oz con el escudo.', 22000, 0],
    ],
  },
};

@Injectable()
export class DemoCatalogSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoCatalogSeeder.name);

  constructor(
    @Inject(CATALOG_CONFIG) private readonly config: CatalogConfig,
    @Inject(LIST_CATEGORIES) private readonly listCategories: ListCategoriesPort,
    @Inject(CREATE_CATEGORY) private readonly createCategory: CreateCategoryPort,
    @Inject(CREATE_PRODUCT) private readonly createProduct: CreateProductPort,
  ) {}

  /** Lo llama NestJS al terminar de arrancar. */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.seedDemoData) return;
    if ((await this.listCategories.execute()).length > 0) return;

    let count = 0;
    for (const [name, { description, products }] of Object.entries(DEMO)) {
      const category = await this.createCategory.execute({ name, description });
      for (const [productName, productDescription, price, stock] of products) {
        await this.createProduct.execute({
          name: productName,
          description: productDescription,
          price,
          stock,
          categoryId: category.id,
          images: [image(productName.toLowerCase().replace(/\W+/g, '-'))],
        });
        count++;
      }
    }
    this.logger.log(`Catálogo de ejemplo creado: ${Object.keys(DEMO).length} categorías y ${count} productos.`);
  }
}
