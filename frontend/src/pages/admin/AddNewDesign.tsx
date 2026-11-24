import React, { DragEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Check, UploadCloud, Crown, Eye, GripVertical, Image as ImageIcon,
  ImagePlus, Info, Layers, Loader2, Plus, Sparkles, Star, TrendingUp, Upload, X,
} from 'lucide-react';
import { apiFetch } from '@/auth/authService';
import { useApiCategories } from '@/features/catalog/hooks/useApiCategories';
import { invalidateClientProductCache } from '@/features/catalog/hooks/useApiProducts';
import { COLLECTIONS, CollectionName } from '@/features/catalog/types/product';

// ─── Constants (match backend limits exactly) ──────────────────────────────────
const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_MIME = /^image\/(jpeg|png|webp)$/;
const DRAFT_KEY = 'skinlab_design_draft';

// ─── Types ─────────────────────────────────────────────────────────────────────
type NewImage = {
  id: string;        // local temp id
  src: string;       // object URL for preview
  file: File;        // original File object needed for upload
  name: string;
  size: number;
};

// ─── Sub-component: Toggle switch row ─────────────────────────────────────────
const SwitchRow: React.FC<{
  title: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  iconClass: string;
}> = ({ title, detail, checked, onToggle, icon, iconClass }) => (
  <div className="flex items-center gap-3 rounded-[20px] border border-brand-border px-3.5 py-2.5 sm:px-4">
    <span className={iconClass}>{icon}</span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-extrabold leading-tight text-brand-navy">{title}</p>
      <p className="mt-1 text-xs leading-tight text-brand-navy/65">{detail}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      onClick={onToggle}
      className={`relative h-8 w-14 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-lime' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────
export const AddNewDesign: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialCategoryParam = searchParams.get('category') || (location.state as { category?: string } | null)?.category || '';
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const idempotencyKeyRef = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`);

  // Draft persistence helper
  const getInitialDraft = () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const draft = getInitialDraft();

  // Form fields
  const [title, setTitle] = useState<string>(draft?.title || '');
  const [categoryId, setCategoryId] = useState<string>('');
  const [collection, setCollection] = useState<CollectionName | ''>(draft?.collection || '');
  const [description, setDescription] = useState<string>(draft?.description || '');
  const [featured, setFeatured] = useState<boolean>(draft?.featured ?? true);
  const [bestseller, setBestseller] = useState<boolean>(draft?.bestseller ?? false);
  const [trending, setTrending] = useState<boolean>(draft?.trending ?? false);

  // Auto-save form draft on slow/unstable connection
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        title,
        collection,
        description,
        featured,
        bestseller,
        trending,
      }));
    } catch {
      // Ignore quota errors
    }
  }, [title, collection, description, featured, bestseller, trending]);

  // Image state
  const [images, setImages] = useState<NewImage[]>([]);
  const [primaryId, setPrimaryId] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  // Live categories from API
  const { categories, isLoading: categoriesLoading, error: categoriesError, retry: retryCategories } = useApiCategories();

  // Automatically associate new design with currently selected category
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      if (initialCategoryParam) {
        const match = categories.find(
          (c) =>
            c.id === initialCategoryParam ||
            c.slug.toLowerCase() === initialCategoryParam.toLowerCase() ||
            c.name.toLowerCase() === initialCategoryParam.toLowerCase()
        );
        if (match) {
          setCategoryId(match.id);
          return;
        }
      }
      // Default to Laptop Skins if available
      const defaultCat = categories.find((c) => c.slug === 'laptop-skins') || categories[0];
      if (defaultCat) {
        setCategoryId(defaultCat.id);
      }
    }
  }, [categories, categoryId, initialCategoryParam]);

  // Auto-generate design number from API (fetch the latest from backend)
  const [nextDesignNumber, setNextDesignNumber] = useState<string>('001');
  useEffect(() => {
    // Fetch next available design number via fast dedicated endpoint
    apiFetch('/products/next-design-number')
      .then((r) => r.json())
      .then((json: { success: boolean; data?: { nextDesignNumber: string } }) => {
        if (json.success && json.data?.nextDesignNumber) {
          setNextDesignNumber(json.data.nextDesignNumber);
        }
      })
      .catch(() => { /* keep default */ });
  }, []);

  // Revoke all object URLs on unmount
  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // ─── Image selection ─────────────────────────────────────────────────────────
  const addFiles = (files: FileList | File[]) => {
    const selected = Array.from(files);
    const remaining = MAX_IMAGES - images.length;
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of selected) {
      if (!ACCEPTED_MIME.test(file.type)) {
        rejected.push(`${file.name}: only JPG, PNG, or WEBP are accepted.`);
      } else if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name}: must be 2 MB or smaller.`);
      } else if (accepted.length >= remaining) {
        rejected.push(`${file.name}: the gallery can contain up to ${MAX_IMAGES} images.`);
      } else {
        accepted.push(file);
      }
    }

    const additions = accepted.map((file) => {
      const src = URL.createObjectURL(file);
      objectUrls.current.push(src);
      return {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        src,
        file,
        name: file.name,
        size: file.size,
      };
    });

    if (additions.length) {
      setImages((current) => [...current, ...additions]);
      setPrimaryId((current) => current || additions[0].id);
    }

    if (rejected.length) {
      setErrors(rejected);
      setNotice('');
    } else if (additions.length) {
      setErrors([]);
      setNotice(`${additions.length} image${additions.length === 1 ? '' : 's'} added as local previews.`);
    }
  };

  const removeImage = (image: NewImage) => {
    URL.revokeObjectURL(image.src);
    objectUrls.current = objectUrls.current.filter((url) => url !== image.src);
    setImages((current) => {
      const remaining = current.filter((item) => item.id !== image.id);
      if (primaryId === image.id) setPrimaryId(remaining[0]?.id ?? '');
      return remaining;
    });
  };

  const reorderImage = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setImages((current) => {
      const result = [...current];
      const from = result.findIndex((item) => item.id === draggingId);
      const to = result.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = result.splice(from, 1);
      result.splice(to, 0, moved);
      return result;
    });
    setDraggingId(null);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    addFiles(event.dataTransfer.files);
  };

  // ─── Submission ───────────────────────────────────────────────────────────────
  const submit = async () => {
    // ── Frontend validation ──
    const nextErrors: string[] = [];
    if (!title.trim()) nextErrors.push('Enter a product title.');
    if (!categoryId) nextErrors.push('Choose a category.');
    if (!collection) nextErrors.push('Choose a collection.');
    if (!description.trim()) nextErrors.push('Add a short description.');
    if (images.length === 0) nextErrors.push('Add at least one image.');
    if (nextErrors.length) {
      setErrors(nextErrors);
      setNotice('');
      return;
    }

    setErrors([]);
    setNotice('');
    setSubmitting(true);

    let createdProductId: string | null = null;

    try {
      // ── Step 1: Create the product record ──────────────────────────────────
      const productPayload = {
        title: title.trim(),
        categoryId,
        collection,
        designStyle: collection,
        designNumber: nextDesignNumber,
        description: description.trim(),
        status: 'PUBLISHED',
        isFeatured: featured,
        isBestseller: bestseller,
        isTrending: trending,
        isNew: true,
        laptopCompatibility: [],
      };

      const productRes = await apiFetch('/products', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKeyRef.current,
        },
        body: JSON.stringify(productPayload),
      });
      const productJson = await productRes.json() as {
        success: boolean;
        data?: { id: string };
        error?: { message?: string; code?: string };
      };

      if (!productRes.ok || !productJson.success || !productJson.data?.id) {
        const msg = productJson.error?.message ?? 'Failed to create design record.';
        setErrors([msg]);
        setSubmitting(false);
        return;
      }

      createdProductId = productJson.data.id;

      // ── Step 2: Upload images to Cloudflare R2 via backend ─────────────────
      //
      // POST /api/images/upload  (multipart/form-data)
      //   images: File[]          — up to 4 files
      //   productId: string       — the newly created product ID
      //   altText: string[]       — optional per-image alt text
      //
      // The backend validates MIME types by reading actual file bytes (magic bytes),
      // enforces the 2 MB per-file and 4-image limits, uploads to R2, and writes
      // the ProductImage rows in a single DB transaction with rollback on failure.

      const primaryIdx = images.findIndex((img) => img.id === primaryId);
      const targetPrimaryIdx = primaryIdx >= 0 ? primaryIdx : 0;

      const formData = new FormData();
      formData.append('productId', createdProductId);
      formData.append('primaryIndex', String(targetPrimaryIdx));

      // Append images in user-arranged gallery order
      for (const img of images) {
        formData.append('images', img.file);
      }

      const uploadRes = await apiFetch('/images/upload', {
        method: 'POST',
        body: formData,
        // No Content-Type header: browser sets multipart/form-data with boundary automatically.
      });
      const uploadJson = await uploadRes.json() as {
        success: boolean;
        data?: { images: { id: string; isPrimary: boolean; sortOrder: number }[] };
        error?: { message?: string; code?: string };
      };

      if (!uploadRes.ok || !uploadJson.success) {
        // Images failed; attempt to delete the product record we just created
        await apiFetch(`/products/${createdProductId}`, { method: 'DELETE' }).catch(() => {
          console.error('[AddNewDesign] Could not delete orphan product', createdProductId);
        });

        const msg = uploadJson.error?.message ?? 'Image upload failed. Please try again.';
        setErrors([msg]);
        setSubmitting(false);
        return;
      }

      // Step 3: Images are already uploaded in parallel and sorted with primary selected in step 2.
      // Clear draft storage and navigate to catalog.
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      invalidateClientProductCache();
      setSubmitting(false);
      const selectedSlug = categories.find((c) => c.id === categoryId)?.slug;
      navigate(selectedSlug ? `/catalog?category=${selectedSlug}` : '/catalog');
    } catch (err) {
      // Network / unexpected error
      console.error('[AddNewDesign] Submission error:', err);

      // If product was created but images failed we attempt cleanup
      if (createdProductId) {
        await apiFetch(`/products/${createdProductId}`, { method: 'DELETE' }).catch(() => {
          console.error('[AddNewDesign] Orphan product cleanup failed:', createdProductId);
        });
      }

      setErrors(['An unexpected error occurred. Please try again.']);
      setSubmitting(false);
    }
  };

  const primary = images.find((image) => image.id === primaryId);
  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name ?? '';

  return (
    <div className="mx-auto max-w-[1450px] py-4 sm:py-5">
      <Link
        to="/catalog"
        className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2 text-sm font-bold text-brand-navy transition hover:bg-brand-border"
      >
        <ArrowLeft size={17} /> Back to Catalog
      </Link>

      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-lime/35 text-brand-navy">
          <ImageIcon size={28} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
            Add New Design
          </h1>
          <p className="mt-1 text-sm text-brand-navy/70 sm:text-base">Create a new design for your catalogue.</p>
        </div>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[0.86fr_1.24fr] xl:gap-7">
        {/* ── Left column: Design Information ── */}
        <section className="rounded-2xl border border-brand-border bg-white p-4 sm:p-5">
          <h2 className="mb-5 flex items-center gap-2.5 font-display text-xl font-extrabold text-brand-navy">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-card">
              <Info size={22} />
            </span>
            Design Information
          </h2>

          <div className="space-y-3.5">
            {/* Product Title */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-brand-navy">
                Product Title <b className="text-red-500">*</b>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cosmic Astronaut"
                disabled={submitting}
                className="h-[43px] w-full rounded-xl border border-[#c8ccd6] px-3.5 text-sm text-brand-navy outline-none placeholder:text-brand-navy/65 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25 disabled:opacity-60"
              />
            </label>

            {/* Category */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-brand-navy">
                Category <b className="text-red-500">*</b>
              </span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={submitting || categoriesLoading || Boolean(categoriesError) || categories.length === 0}
                className="h-[43px] w-full rounded-xl border border-[#c8ccd6] bg-white px-3.5 text-sm text-brand-navy outline-none focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25 disabled:opacity-60"
              >
                <option value="">
                  {categoriesLoading
                    ? 'Loading categories…'
                    : categoriesError
                      ? 'Unable to load categories'
                      : categories.length === 0
                        ? 'No categories available'
                        : 'Select a category'}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {categoriesError && (
                <div className="mt-1 flex items-center gap-2 text-xs text-red-600">
                  <span>{categoriesError}</span>
                  <button
                    type="button"
                    onClick={() => void retryCategories()}
                    disabled={categoriesLoading || submitting}
                    className="font-bold underline disabled:opacity-60"
                  >
                    Retry
                  </button>
                </div>
              )}
            </label>

            {/* Collection */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-brand-navy">
                Collection <b className="text-red-500">*</b>
              </span>
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value as CollectionName)}
                disabled={submitting}
                className="h-[43px] w-full rounded-xl border border-[#c8ccd6] bg-white px-3.5 text-sm text-brand-navy outline-none focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25 disabled:opacity-60"
              >
                <option value="">Select a collection</option>
                {COLLECTIONS.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </label>

            {/* Design Number (auto-generated) */}
            <div>
              <span className="mb-1.5 block text-sm font-extrabold text-brand-navy">
                Design Number <b className="text-red-500">*</b>
              </span>
              <div className="flex h-[43px] items-center rounded-xl border border-brand-border bg-brand-card px-3.5">
                <span className="text-sm font-medium text-brand-navy/70">#{nextDesignNumber}</span>
                <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-navy">
                  <Sparkles size={15} className="text-brand-lime" />
                  Auto-generated
                </span>
              </div>
              <p className="mt-1 text-xs text-brand-navy/65">A unique design number for this product.</p>
            </div>

            {/* Description */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-brand-navy">
                Description <b className="text-red-500">*</b>
              </span>
              <textarea
                value={description}
                maxLength={300}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={submitting}
                placeholder="Write a short description for this design..."
                className="w-full resize-y rounded-xl border border-[#c8ccd6] px-3.5 py-2.5 text-sm leading-relaxed text-brand-navy outline-none placeholder:text-brand-navy/65 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25 disabled:opacity-60"
              />
              <p className="mt-0.5 text-right text-xs text-brand-navy/70">{description.length} / 300</p>
            </label>

            {/* Featured / Bestseller / Trending toggles */}
            <div className="space-y-2">
              <SwitchRow
                title="Featured Design"
                detail={'Show a "Featured Design" badge on this design.'}
                checked={featured}
                onToggle={() => setFeatured((v) => !v)}
                icon={<Sparkles size={26} />}
                iconClass="text-brand-lime"
              />
              <SwitchRow
                title="Bestseller"
                detail={'Show a "Bestseller" badge on this design.'}
                checked={bestseller}
                onToggle={() => setBestseller((v) => !v)}
                icon={<Crown size={26} />}
                iconClass="text-amber-400"
              />
              <SwitchRow
                title="Trending Design"
                detail="Display this design in the homepage Trending Designs section."
                checked={trending}
                onToggle={() => setTrending((v) => !v)}
                icon={<TrendingUp size={26} />}
                iconClass="text-brand-lime"
              />
            </div>
          </div>
        </section>

        {/* ── Right column: Images + Preview ── */}
        <div className="space-y-4">
          {/* Product Images section */}
          <section className="rounded-2xl border border-brand-border bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Layers size={29} className="mt-0.5 flex-shrink-0 text-brand-navy" />
                <div>
                  <h2 className="font-display text-xl font-extrabold leading-tight text-brand-navy">
                    Product Images
                  </h2>
                  <p className="mt-1 text-sm text-brand-navy/70">
                    Upload up to {MAX_IMAGES} images · JPG, PNG, WEBP · Max 2 MB each
                  </p>
                </div>
              </div>
              <span className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-brand-card px-3 py-2 text-xs font-bold text-brand-navy">
                <ImageIcon size={17} />
                {images.length} / {MAX_IMAGES} Images
              </span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.currentTarget.value = '';
              }}
            />

            {/* Drop zone */}
            <div
              onClick={() => !submitting && fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); if (!submitting) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex min-h-[156px] flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-4 text-center transition sm:min-h-[184px] ${submitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${dragOver ? 'border-brand-lime bg-brand-lime/15' : 'border-[#aeb5c2] bg-[#fbfdf6] hover:border-brand-lime'}`}
            >
              <UploadCloud size={44} strokeWidth={1.7} className="mb-1 text-brand-navy" />
              <p className="text-base font-extrabold text-brand-navy">Choose images or drag them here</p>
              <p className="mt-1 text-xs text-brand-navy/75">JPG, PNG or WEBP · Max 2 MB per image</p>
              <button
                type="button"
                disabled={submitting}
                onClick={(e) => { e.stopPropagation(); fileInput.current?.click(); }}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-lime px-5 py-2 text-sm font-extrabold text-brand-navy shadow-sm hover:bg-[#b5e03b] disabled:opacity-60"
              >
                <Upload size={17} /> Choose Images
              </button>
            </div>

            {/* Image gallery */}
            {images.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    draggable={!submitting}
                    onDragStart={() => setDraggingId(image.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); reorderImage(image.id); }}
                    className={`group relative overflow-hidden rounded-xl border-2 bg-brand-card transition ${draggingId === image.id ? 'opacity-50' : ''} ${primaryId === image.id ? 'border-brand-lime' : 'border-transparent'}`}
                  >
                    <button
                      type="button"
                      onClick={() => !submitting && setPrimaryId(image.id)}
                      aria-label="Select primary image"
                      className="block aspect-[1.28] w-full cursor-pointer"
                    >
                      <img src={image.src} alt={image.name} className="h-full w-full object-cover" />
                    </button>

                    {primaryId === image.id && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-lime px-2.5 py-1 text-[10px] font-extrabold text-brand-navy">
                        Primary <Star size={11} className="fill-current" />
                      </span>
                    )}

                    <span
                      className="absolute bottom-1.5 left-1.5 grid h-7 w-7 cursor-grab place-items-center rounded-lg bg-white/95 text-brand-navy shadow-sm"
                      title="Drag to reorder"
                    >
                      <GripVertical size={17} />
                    </span>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => removeImage(image)}
                      aria-label={`Remove ${image.name}`}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-brand-navy shadow-sm hover:text-red-600 disabled:opacity-60"
                    >
                      <X size={18} />
                    </button>

                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
                      {(image.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                ))}

                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => fileInput.current?.click()}
                    className="flex aspect-[1.28] flex-col items-center justify-center rounded-xl border border-dashed border-[#adb5c6] text-brand-navy transition hover:border-brand-lime hover:bg-brand-lime/5 disabled:opacity-60"
                  >
                    <Plus size={31} strokeWidth={1.6} />
                    <span className="mt-1 text-sm font-semibold">Add Image</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => fileInput.current?.click()}
                className="mt-4 flex h-[112px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#adb5c6] text-brand-navy/70 hover:border-brand-lime hover:text-brand-navy disabled:opacity-60"
              >
                <Plus size={29} />
                <span className="mt-1 text-sm font-medium">Add Image</span>
              </button>
            )}

            <p className="mt-3 flex items-center gap-2 text-xs text-brand-navy/70">
              <Info size={17} />
              Select a primary image and arrange gallery order by dragging.
            </p>
          </section>

          {/* Live Preview */}
          <section className="grid gap-4 rounded-2xl border border-[#deebd0] bg-[#f6fbea] p-4 sm:grid-cols-[0.7fr_1.3fr] sm:items-center sm:p-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-3 py-1.5 text-xs font-extrabold text-brand-navy">
                <Eye size={17} />
                Live Preview
              </span>
              <p className="mt-3 text-sm leading-relaxed text-brand-navy/75">
                This is how your design will look in the catalogue.
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-card sm:p-3.5">
              <div className="h-[96px] w-[38%] flex-shrink-0 overflow-hidden rounded-xl bg-brand-card sm:h-[118px]">
                {primary ? (
                  <img src={primary.src} alt="Design preview" className="h-full w-full object-contain" />
                ) : (
                  <div className="grid h-full place-items-center text-brand-navy/25">
                    <ImagePlus size={34} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex max-w-full truncate rounded-full bg-[#ffe4d9] px-2.5 py-1 text-[10px] font-bold text-brand-navy">
                    {selectedCategoryName || 'Category'}
                  </span>
                  {collection && (
                    <span className="inline-flex max-w-full truncate rounded-full bg-brand-lime/25 px-2.5 py-1 text-[10px] font-bold text-brand-navy">
                      {collection}
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 truncate font-display text-base font-extrabold text-brand-navy sm:text-lg">
                  {title.trim() || 'Your design title'}
                </h3>
                <p className="mt-0.5 text-xs text-brand-navy/55">Design #{nextDesignNumber}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-brand-navy/55">
                  {description || 'Your design description will appear here.'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Error / Notice banner */}
      {(errors.length > 0 || notice) && (
        <div
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${errors.length ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-brand-lime/50 bg-brand-lime/15 text-brand-navy'}`}
        >
          {errors.length ? (
            <ul className="list-inside list-disc">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : notice}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-brand-border bg-white p-3 sm:flex-row">
        <button
          type="button"
          disabled={submitting}
          onClick={() => navigate('/catalog')}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-card text-base font-semibold text-brand-navy hover:bg-brand-border disabled:opacity-60"
        >
          <X size={20} /> Cancel
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-lime text-base font-extrabold text-brand-navy hover:bg-[#b5e03b] disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Creating Design…
            </>
          ) : (
            <>
              <Check size={22} strokeWidth={2.5} /> Create Design
            </>
          )}
        </button>
      </div>
    </div>
  );
};
