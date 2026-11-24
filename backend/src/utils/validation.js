import { z } from 'zod';
export const CreateProductSchema = z.object({
    title: z.string().trim().min(1, 'Product title is required').max(200),
    categoryId: z.string().uuid('Invalid category ID'),
    designNumber: z.string().trim().min(1, 'Design number is required').max(20),
    description: z.string().trim().min(1, 'Description is required').max(3000),
    designStyle: z.string().trim().max(50).nullable().optional(),
    collection: z.string().trim().max(50).nullable().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
    isFeatured: z.boolean().default(false),
    isBestseller: z.boolean().default(false),
    isTrending: z.boolean().default(false),
    isNew: z.boolean().default(false),
    badge: z.string().max(50).nullable().optional(),
    finish: z.string().max(50).nullable().optional(),
    material: z.string().max(200).nullable().optional(),
    dimensions: z.string().max(100).nullable().optional(),
    laptopCompatibility: z.array(z.string()).default([]),
    price: z.number().positive().nullable().optional(),
    originalPrice: z.number().positive().nullable().optional(),
}).strict();
export const UpdateProductSchema = CreateProductSchema.partial();
export const CreateCategorySchema = z.object({
    name: z.string().trim().min(1, 'Category name is required').max(80),
    slug: z.string().trim().max(80).optional(),
    description: z.string().max(1000).optional(),
    imageUrl: z.string().url().or(z.string().startsWith('/')).optional(),
    iconName: z.string().max(50).optional(),
    cardColor: z.string().max(20).optional(),
    accentColor: z.string().max(20).optional(),
    textColor: z.string().max(20).optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
}).strict();
export const UpdateCategorySchema = CreateCategorySchema.partial();
export const CategoryStatusSchema = z.object({ isActive: z.boolean() }).strict();
export const UpdateShopSchema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().max(4000).nullable().optional(),
    logoUrl: z.string().url().nullable().optional(),
    contactEmail: z.string().trim().email().max(255).optional(),
    contactPhone: z.string().trim().max(50).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one shop field must be provided');
export const ImageReorderSchema = z.object({
    productId: z.string().uuid(),
    images: z.array(z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0),
        isPrimary: z.boolean().optional(),
    })).min(1).max(4, 'Maximum 4 images permitted').superRefine((images, context) => {
        if (new Set(images.map((image) => image.id)).size !== images.length) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: 'Image ids must be unique' });
        }
        if (images.filter((image) => image.isPrimary === true).length > 1) {
            context.addIssue({ code: z.ZodIssueCode.custom, message: 'Only one image can be primary' });
        }
    }),
}).strict();
//# sourceMappingURL=validation.js.map
