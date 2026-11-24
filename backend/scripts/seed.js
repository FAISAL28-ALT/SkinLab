import { PrismaClient, ProductStatus, ProfileRole } from '@prisma/client';
import { randomBytes, randomUUID } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { env } from '../src/config/env.js';
const prisma = new PrismaClient();
async function main() {
    console.log('Starting SkinLab database seed...');
    // 1. Create or upsert the default shop
    const shop = await prisma.shop.upsert({
        where: { slug: 'skinlab-official' },
        update: {},
        create: {
            name: 'SkinLab Official',
            slug: 'skinlab-official',
            description: 'Precision die-cut skins engineered with authentic 3M materials.',
            contactEmail: 'hello@skinlab.com',
            contactPhone: '+1 (555) 019-2834',
            isActive: true,
        },
    });
    console.log(`Default shop ready: ${shop.name} (${shop.id})`);
    const adminEmail = env.INITIAL_ADMIN_EMAIL;
    if (!adminEmail) throw new Error('INITIAL_ADMIN_EMAIL is required to seed the initial administrator.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('INITIAL_ADMIN_EMAIL must be a valid email address.');
    const existingAdmin = await prisma.profile.findFirst({ where: { email: adminEmail }, select: { id: true } });
    if (!existingAdmin) {
        const initialPassword = env.INITIAL_ADMIN_PASSWORD || randomBytes(24).toString('base64url');
        const passwordHash = await hash(initialPassword, { algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 });
        await prisma.profile.create({ data: { id: randomUUID(), email: adminEmail, fullName: 'Initial Administrator', role: ProfileRole.SHOP_ADMIN, shopId: shop.id, credential: { create: { loginId: adminEmail, passwordHash, mustChangePassword: true } } } });
        console.log(`Initial administrator created for ${adminEmail}. Initial password (shown once): ${initialPassword}`);
    }
    else console.log('Initial administrator already exists; its credentials were not changed.');
    // 2. Categories: 8 device categories
    const categoriesData = [
        {
            name: 'Laptop Skins',
            slug: 'laptop-skins',
            iconName: 'Laptop',
            description: 'Precision die-cut skins engineered with authentic 3M materials. Filter by category, design style, or search directly by design number.',
            sortOrder: 1,
        },
        {
            name: 'Mobile Skin',
            slug: 'mobile-skin',
            iconName: 'Smartphone',
            description: 'Ultra-thin precision wraps engineered with authentic 3M materials. Protect and personalize your smartphone.',
            sortOrder: 2,
        },
        {
            name: 'Tablet Skin',
            slug: 'tablet-skin',
            iconName: 'Tablet',
            description: 'Full-coverage premium wraps engineered with authentic 3M materials. Guard your tablet with style.',
            sortOrder: 3,
        },
        {
            name: 'Camera Skin',
            slug: 'camera-skin',
            iconName: 'Camera',
            description: 'Textured protective wraps engineered with authentic 3M materials. Enhanced grip and defense for camera bodies.',
            sortOrder: 4,
        },
        {
            name: 'Camera Lens Skin',
            slug: 'camera-lens-skin',
            iconName: 'Cylinder',
            description: 'Precision-cut lens barrel wraps engineered with authentic 3M materials. Protect your glass bodies from scratches and wear.',
            sortOrder: 5,
        },
        {
            name: 'Card Skin',
            slug: 'card-skin',
            iconName: 'CreditCard',
            description: 'Ultra-slim protective card wraps engineered with authentic 3M materials. Customize your payment and transit cards.',
            sortOrder: 6,
        },
        {
            name: 'Gaming Skin',
            slug: 'gaming-skin',
            iconName: 'Gamepad2',
            description: 'High-durability console and controller skins engineered with authentic 3M materials. Level up your gaming setup.',
            sortOrder: 7,
        },
        {
            name: 'DJI Skins',
            slug: 'dji-skins',
            iconName: 'Drone',
            description: 'Precision-cut drone and controller wraps engineered with authentic 3M materials. High visibility and maximum style in flight.',
            sortOrder: 8,
        },
    ];
    let laptopCategoryId = '';
    for (const cat of categoriesData) {
        const created = await prisma.category.upsert({
            where: {
                shopId_slug: {
                    shopId: shop.id,
                    slug: cat.slug,
                },
            },
            update: {
                name: cat.name,
                iconName: cat.iconName,
                description: cat.description,
                sortOrder: cat.sortOrder,
                isActive: true,
            },
            create: {
                shopId: shop.id,
                name: cat.name,
                slug: cat.slug,
                description: cat.description,
                iconName: cat.iconName,
                sortOrder: cat.sortOrder,
                isActive: true,
            },
        });
        if (cat.slug === 'laptop-skins') {
            laptopCategoryId = created.id;
        }
    }
    // Deactivate old design-style categories if they exist
    await prisma.category.updateMany({
        where: {
            shopId: shop.id,
            slug: { in: ['anime', 'cars', 'travel', 'gaming', 'aesthetic', 'abstract'] },
        },
        data: { isActive: false },
    });
    console.log(`Seeded ${categoriesData.length} categories.`);
    // 3. Products from existing frontend (src/data/products.ts)
    const productsData = [
        {
            designNumber: '028',
            title: 'Nezuko Art',
            slug: 'nezuko-art-028',
            categoryName: 'anime',
            description: 'Striking anime artwork featuring glowing embers, vivid crimson tones and high-precision matte finish. A signature flagship edition for true enthusiasts.',
            price: 34.99,
            originalPrice: 42.00,
            rating: 4.9,
            reviewCount: 384,
            image: '/assets/skins/anime/pain.webp',
            laptopCompatibility: ['MacBook Air 13', 'HP Pavilion 15', 'Dell Inspiron 15', 'Lenovo IdeaPad 15'],
            isFeatured: true,
            isTrending: true,
            isNew: true,
            finish: 'Matte Anti-Glare',
            material: '3M Controltac Vinyl with Air-Release Channels',
            dimensions: 'Precision die-cut per model specification',
            badge: 'Trending #1',
        },
        {
            designNumber: '013',
            title: 'Space & Galaxy',
            slug: 'space-galaxy-013',
            categoryName: 'travel',
            description: 'Cosmic deep space astronaut exploration edition with vibrant celestial nebulae and pixel stars. Engineered with authentic 3M cast vinyl.',
            price: 32.99,
            originalPrice: 38.00,
            rating: 4.8,
            reviewCount: 219,
            image: '/assets/skins/travel/cosmic-astronaut.png',
            laptopCompatibility: ['HP Pavilion 15', 'MacBook Air 13', 'Dell Inspiron 15'],
            isFeatured: true,
            isTrending: true,
            isNew: false,
            finish: 'Matte Anti-Glare',
            material: 'Ultra-thin 3M cast vinyl',
            badge: 'Staff Pick',
        },
        {
            designNumber: '021',
            title: 'Cartoon & Animation',
            slug: 'cartoon-animation-021',
            categoryName: 'travel',
            description: 'Expressive cartoon animation artwork featuring iconic angry cat illustration with bold modern streetwear newspaper typography backdrop.',
            price: 29.99,
            originalPrice: 36.00,
            rating: 4.7,
            reviewCount: 142,
            image: '/assets/skins/travel/tom-angry-cat.png',
            laptopCompatibility: ['MacBook Air 13', 'Lenovo IdeaPad 15', 'HP Pavilion 15'],
            isFeatured: true,
            isTrending: true,
            isNew: false,
            finish: 'Glossy Ultra',
            material: 'Triple-layer protective film',
        },
        {
            designNumber: '024',
            title: 'Porsche GTR',
            slug: 'porsche-gtr-024',
            categoryName: 'cars',
            description: 'High-octane supercar tribute featuring iconic neon magenta and deep purple motorsport livery with bold typography styling.',
            price: 36.99,
            originalPrice: 44.00,
            rating: 5.0,
            reviewCount: 420,
            image: '/assets/skins/cars/GTR.png',
            laptopCompatibility: ['MacBook Air 13', 'Dell Inspiron 15', 'HP Pavilion 15', 'Lenovo IdeaPad 15'],
            isFeatured: true,
            isTrending: true,
            isNew: true,
            finish: 'Matte Anti-Glare',
            material: 'Scratch-resistant 3M vehicle-grade vinyl',
            badge: 'Bestseller',
        },
        {
            designNumber: '009',
            title: 'Anime Blue',
            slug: 'anime-blue-009',
            categoryName: 'anime',
            description: 'Legendary rogue ninja in deep crimson smoke and midnight atmosphere. High-impact anime character illustration with exquisite details.',
            price: 31.99,
            originalPrice: 39.00,
            rating: 4.8,
            reviewCount: 189,
            image: '/assets/skins/anime/Itachi.png',
            laptopCompatibility: ['MacBook Air 13', 'HP Pavilion 15', 'Dell Inspiron 15'],
            isFeatured: true,
            isTrending: true,
            isNew: false,
            finish: 'Matte Anti-Glare',
            material: 'Bubble-free adhesive vinyl',
        },
        {
            designNumber: '007',
            title: 'Porsche 911 GT3',
            slug: 'porsche-911-gt3-007',
            categoryName: 'cars',
            description: 'Track-ready Porsche 911 GT3 with bold typography and racing aerodynamics on premium matte vinyl finish.',
            price: 28.99,
            originalPrice: 35.00,
            rating: 4.6,
            reviewCount: 97,
            image: '/assets/skins/cars/Porsche 911 GT3.png',
            laptopCompatibility: ['MacBook Air 13', 'Dell Inspiron 15', 'Lenovo IdeaPad 15'],
            isFeatured: true,
            isTrending: true,
            isNew: false,
            finish: 'Textured Vinyl',
            material: 'Heavy-duty non-residue adhesive',
        },
        {
            designNumber: '029',
            title: 'Cyber Samurai',
            slug: 'cyber-samurai-029',
            categoryName: 'anime',
            description: 'Futuristic Neo-Tokyo blade warrior set against a synthetic magenta twilight and neon grid. High-octane contrast with edge-to-edge richness.',
            price: 33.99,
            originalPrice: 40.00,
            rating: 4.9,
            reviewCount: 156,
            image: '/assets/skins/anime/skin-029.webp',
            laptopCompatibility: ['MacBook Air 13', 'HP Pavilion 15', 'Dell Inspiron 15', 'Lenovo IdeaPad 15'],
            isFeatured: false,
            isNew: true,
            finish: 'Matte Anti-Glare',
            material: '3M Controltac Vinyl',
        },
        {
            designNumber: '030',
            title: 'Night Drift 911',
            slug: 'night-drift-911-030',
            categoryName: 'cars',
            description: 'Tokyo midnight highway aesthetic with neon speed trails and iconic rear wing curvature. High contrast neon orange and sky blue light trails.',
            price: 35.99,
            originalPrice: 42.00,
            rating: 4.9,
            reviewCount: 203,
            image: '/assets/skins/cars/skin-030.webp',
            laptopCompatibility: ['MacBook Air 13', 'Dell Inspiron 15', 'HP Pavilion 15'],
            isFeatured: false,
            isNew: true,
            finish: 'Glossy Ultra',
            material: 'UV-cured protective coating',
        },
        {
            designNumber: '041',
            title: 'Cyber Mecha Grid',
            slug: 'cyber-mecha-grid-041',
            categoryName: 'gaming',
            description: 'Hardwired tactical mecha chassis with HUD telemetry grids and glowing cyan circuit paths. Perfect companion for gaming laptops.',
            price: 34.99,
            originalPrice: 40.00,
            rating: 4.8,
            reviewCount: 167,
            image: '/assets/skins/gaming/skin-041.webp',
            laptopCompatibility: ['MacBook Air 13', 'Dell Inspiron 15', 'Lenovo IdeaPad 15', 'HP Pavilion 15'],
            isFeatured: false,
            isNew: false,
            finish: 'Matte Anti-Glare',
            material: '3M Textured Vinyl',
        },
        {
            designNumber: '042',
            title: 'Pixel Retro Arcade',
            slug: 'pixel-retro-arcade-042',
            categoryName: 'gaming',
            description: 'Nostalgic 8-bit mosaic blocks infused with modern neo-brutalist palette accents in lime, electric blue and sunburst orange.',
            price: 29.99,
            originalPrice: 35.00,
            rating: 4.7,
            reviewCount: 112,
            image: '/assets/skins/gaming/skin-042.webp',
            laptopCompatibility: ['MacBook Air 13', 'Dell Inspiron 15', 'Lenovo IdeaPad 15'],
            isFeatured: false,
            isNew: false,
            finish: 'Textured Vinyl',
            material: 'Scratch-shield laminated film',
        },
        {
            designNumber: '051',
            title: 'Desert Sun Dunes',
            slug: 'desert-sun-dunes-051',
            categoryName: 'aesthetic',
            description: 'Warm terracotta rolling dunes bathed in radiant golden hour sunlight. Calming minimalist editorial curves with organic texture.',
            price: 31.99,
            originalPrice: 37.00,
            rating: 4.8,
            reviewCount: 231,
            image: '/assets/skins/aesthetic/skin-051.webp',
            laptopCompatibility: ['MacBook Air 13', 'HP Pavilion 15', 'Dell Inspiron 15', 'Lenovo IdeaPad 15'],
            isFeatured: false,
            isNew: false,
            finish: 'Matte Anti-Glare',
            material: 'Ultra-soft touch matte vinyl',
        },
        {
            designNumber: '052',
            title: 'Botanical Flora Garden',
            slug: 'botanical-flora-garden-052',
            categoryName: 'aesthetic',
            description: 'Lush emerald foliage and lime botanical silhouettes on deep forest background. Brings clean organic biophilic energy to your desk.',
            price: 30.99,
            originalPrice: 38.00,
            rating: 4.7,
            reviewCount: 88,
            image: '/assets/skins/aesthetic/skin-052.webp',
            laptopCompatibility: ['MacBook Air 13', 'HP Pavilion 15', 'Lenovo IdeaPad 15'],
            isFeatured: false,
            isNew: false,
            finish: 'Matte Anti-Glare',
            material: 'Bubble-free adhesive vinyl',
        },
        {
            designNumber: '061',
            title: 'Neo Memphis Geometry',
            slug: 'neo-memphis-geometry-061',
            categoryName: 'abstract',
            description: 'Bold Bauhaus geometry, electric primary blocks, clean diagonal hatching and playful asymmetrical forms inspired by modern creative studios.',
            price: 33.99,
            originalPrice: 39.00,
            rating: 4.9,
            reviewCount: 178,
            image: '/assets/skins/abstract/skin-061.webp',
            laptopCompatibility: ['MacBook Air 13', 'HP Pavilion 15', 'Dell Inspiron 15', 'Lenovo IdeaPad 15'],
            isFeatured: false,
            isNew: true,
            finish: 'Textured Vinyl',
            material: 'Precision cut vinyl with air-release',
        },
        {
            designNumber: '062',
            title: 'Liquid Chrome Waves',
            slug: 'liquid-chrome-waves-062',
            categoryName: 'abstract',
            description: 'Mesmerizing fluid mercury curves with electric blue and lime luminescence. A dark mode centerpiece that catches ambient light effortlessly.',
            price: 32.99,
            originalPrice: 38.00,
            rating: 4.8,
            reviewCount: 145,
            image: '/assets/skins/abstract/skin-062.webp',
            laptopCompatibility: ['MacBook Air 13', 'HP Pavilion 15', 'Dell Inspiron 15'],
            isFeatured: false,
            isNew: false,
            finish: 'Glossy Ultra',
            material: '3M cast vinyl',
        },
    ];
    for (const item of productsData) {
        const styleName = item.categoryName.charAt(0).toUpperCase() + item.categoryName.slice(1);
        const product = await prisma.product.upsert({
            where: {
                shopId_designNumber: {
                    shopId: shop.id,
                    designNumber: item.designNumber,
                },
            },
            update: {
                title: item.title,
                slug: item.slug,
                categoryId: laptopCategoryId,
                designStyle: styleName,
                description: item.description,
                price: item.price,
                originalPrice: item.originalPrice,
                rating: item.rating,
                reviewCount: item.reviewCount,
                isFeatured: item.isFeatured,
                isTrending: item.isTrending ?? false,
                isNew: item.isNew,
                finish: item.finish,
                material: item.material,
                dimensions: item.dimensions,
                laptopCompatibility: item.laptopCompatibility,
                badge: item.badge,
                status: ProductStatus.PUBLISHED,
            },
            create: {
                shopId: shop.id,
                categoryId: laptopCategoryId,
                designStyle: styleName,
                title: item.title,
                slug: item.slug,
                designNumber: item.designNumber,
                description: item.description,
                status: ProductStatus.PUBLISHED,
                price: item.price,
                originalPrice: item.originalPrice,
                rating: item.rating,
                reviewCount: item.reviewCount,
                isFeatured: item.isFeatured,
                isTrending: item.isTrending ?? false,
                isNew: item.isNew,
                finish: item.finish,
                material: item.material,
                dimensions: item.dimensions,
                laptopCompatibility: item.laptopCompatibility,
                badge: item.badge,
                images: {
                    create: {
                        originalKey: item.image,
                        previewKey: item.image,
                        thumbnailKey: item.image,
                        altText: `${item.title} Laptop Skin`,
                        isPrimary: true,
                        sortOrder: 0,
                        fileSize: 1024 * 350,
                        mimeType: 'image/webp',
                    },
                },
            },
        });
        console.log(`  ✓ Product seeded: #${product.designNumber} ${product.title}`);

        const existingImg = await prisma.productImage.findFirst({
            where: { productId: product.id, isPrimary: true },
        });
        if (existingImg) {
            await prisma.productImage.update({
                where: { id: existingImg.id },
                data: {
                    originalKey: item.image,
                    previewKey: item.image,
                    thumbnailKey: item.image,
                    altText: `${item.title} Laptop Skin`,
                },
            });
        }
    }
    console.log(' Database seed complete!');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
