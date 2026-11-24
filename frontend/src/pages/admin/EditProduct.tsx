import React, { DragEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Check, Crown, Eye, GripVertical, Image as ImageIcon,
  ImagePlus, Info, Layers, Loader2, Plus, Save, Sparkles, Star, Trash2, TrendingUp, Upload, UploadCloud, X,
} from 'lucide-react';
import { apiFetch } from '@/auth/authService';
import { useApiCategories } from '@/features/catalog/hooks/useApiCategories';
import { invalidateClientProductCache, useApiProduct } from '@/features/catalog/hooks/useApiProducts';
import { COLLECTIONS, CollectionName } from '@/features/catalog/types/product';

// ─── Constants (matching backend limits) ─────────────────────────────────────────
const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_MIME = /^image\/(jpeg|png|webp)$/;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface GalleryImage {
  id: string;               // DB image id or local temp id
  src: string;              // CDN/local URL or object URL
  name: string;
  size: number;
  isExisting: boolean;      // true if already saved in database / R2
  file?: File;              // defined only for newly added local files
  originalKey?: string;
}

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

export function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  // Fetch live product from API
  const { product, isLoading: productLoading, error: productError, refetch: refetchProduct } = useApiProduct(id);

  // Live categories from API
  const { categories, isLoading: categoriesLoading, error: categoriesError, retry: retryCategories } = useApiCategories();

  // Form state
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collection, setCollection] = useState<CollectionName | ''>('');
  const [designNumber, setDesignNumber] = useState('');
  const [description, setDescription] = useState('');
  const [featured, setFeatured] = useState(false);
  const [bestseller, setBestseller] = useState(false);
  const [trending, setTrending] = useState(false);

  // Image management state
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [primaryId, setPrimaryId] = useState('');
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Status and submission state
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Populate form fields once product loads
  useEffect(() => {
    if (product && !isInitialized) {
      setTitle(product.title || '');
      setCategoryId(product.categoryId || product.category?.id || '');
      setCollection((product.collection || product.designStyle || '') as CollectionName);
      setDesignNumber(product.designNumber || '');
      setDescription(product.description || '');
      setFeatured(Boolean(product.isFeatured));
      setBestseller(Boolean(product.isBestseller));
      setTrending(Boolean(product.isTrending));

      const loadedImages: GalleryImage[] = (product.images || []).map((img, index) => ({
        id: img.id,
        src: img.url,
        name: img.altText || `Design image ${index + 1}`,
        size: img.fileSize || 0,
        isExisting: true,
        originalKey: img.originalKey,
      }));

      setImages(loadedImages);

      // Identify primary image
      const primaryImg = product.images?.find((img) => img.isPrimary);
      setPrimaryId(primaryImg?.id || loadedImages[0]?.id || '');

      setDeletedImageIds([]);
      setIsInitialized(true);
    }
  }, [product, isInitialized]);

  // Clean up created object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // ── Image Addition ─────────────────────────────────────────────────────────
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

    const additions: GalleryImage[] = accepted.map((file) => {
      const src = URL.createObjectURL(file);
      objectUrls.current.push(src);
      return {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        src,
        name: file.name,
        size: file.size,
        isExisting: false,
        file,
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
      setNotice(`${additions.length} image${additions.length === 1 ? '' : 's'} added. Click "Save Changes" to upload.`);
    }
  };

  // ── Image Removal ──────────────────────────────────────────────────────────
  const removeImage = (image: GalleryImage) => {
    if (image.isExisting) {
      // Mark existing image for deletion upon saving
      setDeletedImageIds((current) => [...current, image.id]);
    } else {
      // Local preview: revoke URL immediately
      URL.revokeObjectURL(image.src);
      objectUrls.current = objectUrls.current.filter((url) => url !== image.src);
    }

    setImages((current) => {
      const remaining = current.filter((item) => item.id !== image.id);
      if (primaryId === image.id) {
        setPrimaryId(remaining[0]?.id ?? '');
      }
      return remaining;
    });
  };

  // ── Drag and Drop Reordering ──────────────────────────────────────────────
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

  // ── Form Submission ────────────────────────────────────────────────────────
  const submit = async () => {
    if (!product || !id) return;

    // Validate inputs
    const validation: string[] = [];
    if (!title.trim()) validation.push('Product title is required.');
    if (!categoryId) validation.push('Product category is required.');
    if (!collection) validation.push('Product collection is required.');
    if (!description.trim()) validation.push('Product description is required.');
    if (images.length === 0) validation.push('Add at least one product image.');

    if (validation.length) {
      setErrors(validation);
      setNotice('');
      return;
    }

    setErrors([]);
    setNotice('');
    setSubmitting(true);

    try {
      // 1. Update product details if any changed
      const changedFields: Record<string, any> = {};
      if (title.trim() !== product.title) changedFields.title = title.trim();
      const currentCatId = product.categoryId || product.category?.id;
      if (categoryId !== currentCatId) changedFields.categoryId = categoryId;
      const currentCollection = product.collection || product.designStyle || '';
      if (collection !== currentCollection) {
        changedFields.collection = collection;
        changedFields.designStyle = collection;
      }
      if (description.trim() !== product.description) changedFields.description = description.trim();
      if (featured !== Boolean(product.isFeatured)) changedFields.isFeatured = featured;
      if (bestseller !== Boolean(product.isBestseller)) changedFields.isBestseller = bestseller;
      if (trending !== Boolean(product.isTrending)) changedFields.isTrending = trending;

      if (Object.keys(changedFields).length > 0) {
        const patchRes = await apiFetch(`/products/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(changedFields),
        });
        const patchJson = await patchRes.json().catch(() => null) as {
          success?: boolean;
          error?: { message?: string } | string;
        } | null;

        if (!patchRes.ok || !patchJson?.success) {
          const errMsg = typeof patchJson?.error === 'string'
            ? patchJson.error
            : patchJson?.error?.message ?? 'Failed to update product details.';
          throw new Error(errMsg);
        }
      }

      // 2. Delete images that the administrator removed in parallel
      // We perform deletions before uploading to prevent exceeding the MAX_IMAGES limit
      if (deletedImageIds.length > 0) {
        await Promise.all(
          deletedImageIds.map((delId) =>
            apiFetch(`/images/${delId}`, { method: 'DELETE' }).catch((err) => {
              console.warn(`[EditProduct] Failed to delete image ${delId}:`, err);
            })
          )
        );
      }

      // 3. Upload newly added local images to Cloudflare R2 via backend
      const newImages = images.filter((img) => !img.isExisting && img.file);
      const uploadedMap = new Map<string, string>(); // maps temp id -> real db image id

      if (newImages.length > 0) {
        const formData = new FormData();
        formData.append('productId', id);
        for (const img of newImages) {
          formData.append('images', img.file!);
        }

        const uploadRes = await apiFetch('/images/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadJson = await uploadRes.json().catch(() => null) as {
          success?: boolean;
          data?: { images: Array<{ id: string }> };
          error?: { message?: string } | string;
        } | null;

        if (!uploadRes.ok || !uploadJson?.success || !Array.isArray(uploadJson.data?.images)) {
          const errMsg = typeof uploadJson?.error === 'string'
            ? uploadJson.error
            : uploadJson?.error?.message ?? 'Failed to upload images to R2 storage.';
          throw new Error(errMsg);
        }

        const createdImages = uploadJson.data.images;
        newImages.forEach((img, idx) => {
          if (createdImages[idx]) {
            uploadedMap.set(img.id, createdImages[idx].id);
          }
        });
      }

      // 4. Update gallery order & primary image selection only when modified
      // Map all images in user-arranged order to their real database UUIDs
      const realOrder = images.map((img) => ({
        tempId: img.id,
        realId: img.isExisting ? img.id : uploadedMap.get(img.id)!,
      })).filter((item) => Boolean(item.realId));

      if (realOrder.length > 0) {
        // Resolve which real ID is primary
        const resolvedPrimary = realOrder.find((item) => item.tempId === primaryId)?.realId
          || realOrder[0].realId;

        // Skip unnecessary reorder network call if images and primary flag remain unchanged
        const originalImages = product.images || [];
        const orderUnchanged = newImages.length === 0 &&
          deletedImageIds.length === 0 &&
          realOrder.length === originalImages.length &&
          realOrder.every((item, idx) => item.realId === originalImages[idx]?.id) &&
          originalImages.find((img) => img.isPrimary)?.id === resolvedPrimary;

        if (!orderUnchanged) {
          const reorderItems = realOrder.map((item, idx) => ({
            id: item.realId,
            sortOrder: idx,
            isPrimary: item.realId === resolvedPrimary,
          }));

          const reorderRes = await apiFetch('/images/reorder', {
            method: 'PATCH',
            body: JSON.stringify({ productId: id, items: reorderItems }),
          });

          if (!reorderRes.ok) {
            const reorderJson = await reorderRes.json().catch(() => null);
            console.warn('[EditProduct] Image reorder failed (non-fatal):', reorderJson);
          }
        }
      }

      // 5. Invalidate client caches and return to product page
      invalidateClientProductCache();
      setSubmitting(false);
      navigate(`/product/${id}`);
    } catch (err) {
      console.error('[EditProduct] Save error:', err);
      setErrors([err instanceof Error ? err.message : 'An error occurred while saving changes.']);
      setSubmitting(false);
    }
  };

  // ── Permanent Product Deletion ─────────────────────────────────────────────
  const handleDeleteProduct = async () => {
    if (!id) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await apiFetch(`/products/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => null) as {
        success?: boolean;
        error?: { message?: string } | string;
      } | null;

      if (!res.ok || !json?.success) {
        const errMsg = typeof json?.error === 'string'
          ? json.error
          : json?.error?.message ?? 'Failed to delete product. Please try again.';
        throw new Error(errMsg);
      }

      // Invalidate frontend client cache
      invalidateClientProductCache();

      // Navigate to catalog with success flash notice
      navigate('/catalog', {
        replace: true,
        state: { notice: 'Design deleted successfully.' },
      });
    } catch (err) {
      console.error('[EditProduct] Delete error:', err);
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete product.');
      setDeleting(false);
    }
  };

  // ── Loading & Not Found states ─────────────────────────────────────────────
  if (productLoading) {
    return (
      <div className="mx-auto max-w-[1450px] py-20 text-center">
        <Loader2 size={36} className="mx-auto animate-spin text-brand-navy/60" />
        <p className="mt-4 text-sm font-bold text-brand-navy/70">Loading product details…</p>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-sm font-semibold text-red-600">
          {productError || 'Product not found.'}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => void refetchProduct()}
            className="rounded-full border border-brand-border bg-white px-5 py-2.5 text-sm font-bold text-brand-navy hover:bg-brand-card"
          >
            Retry
          </button>
          <Link
            to="/catalog"
            className="inline-flex rounded-full bg-brand-lime px-5 py-2.5 text-sm font-bold text-brand-navy hover:bg-[#b5e03b]"
          >
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const primary = images.find((image) => image.id === primaryId) || images[0];
  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name || product.category?.name || '';

  return (
    <div className="mx-auto max-w-[1450px] py-4 sm:py-5">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={`/product/${product.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2 text-sm font-bold text-brand-navy transition hover:bg-brand-border"
        >
          <ArrowLeft size={17} /> Back to Product
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2 text-sm font-bold text-brand-navy transition hover:bg-brand-border"
          >
            Catalog
          </Link>
          <button
            type="button"
            disabled={submitting || deleting}
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 size={16} /> Delete Design
          </button>
        </div>
      </div>

      <header className="mb-5 flex items-center gap-3">
        <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-lime/35 text-brand-navy">
          <ImageIcon size={28} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
            Edit Product Design
          </h1>
          <p className="mt-1 text-sm text-brand-navy/70 sm:text-base">
            Manage product details, pricing, and image gallery.
          </p>
        </div>
      </header>

      <div className="grid items-stretch gap-5 lg:grid-cols-[0.86fr_1.24fr] xl:gap-7">
        {/* ── Left column: Product Information ── */}
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
                disabled={submitting || categoriesLoading}
                className="h-[43px] w-full rounded-xl border border-[#c8ccd6] bg-white px-3.5 text-sm text-brand-navy outline-none focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25 disabled:opacity-60"
              >
                <option value="">
                  {categoriesLoading
                    ? 'Loading categories…'
                    : categoriesError
                      ? 'Unable to load categories'
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

            {/* Design Number (read-only) */}
            <div>
              <span className="mb-1.5 block text-sm font-extrabold text-brand-navy">
                Design Number
              </span>
              <div className="flex h-[43px] items-center rounded-xl border border-brand-border bg-brand-card px-3.5">
                <span className="text-sm font-mono font-bold text-brand-navy/80">#{designNumber}</span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-navy">
                  Read only
                </span>
              </div>
              <p className="mt-1 text-xs text-brand-navy/65">Design numbers are permanent and uniquely indexed.</p>
            </div>

            {/* Description */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-brand-navy">
                Description <b className="text-red-500">*</b>
              </span>
              <textarea
                value={description}
                maxLength={3000}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={submitting}
                placeholder="Write a description for this design..."
                className="w-full resize-y rounded-xl border border-[#c8ccd6] px-3.5 py-2.5 text-sm leading-relaxed text-brand-navy outline-none placeholder:text-brand-navy/65 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25 disabled:opacity-60"
              />
              <p className="mt-0.5 text-right text-xs text-brand-navy/70">{description.length} / 3000</p>
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
              className={`flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-4 text-center transition ${submitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${dragOver ? 'border-brand-lime bg-brand-lime/15' : 'border-[#aeb5c2] bg-[#fbfdf6] hover:border-brand-lime'}`}
            >
              <UploadCloud size={40} strokeWidth={1.7} className="mb-1 text-brand-navy" />
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
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-lime px-2.5 py-1 text-[10px] font-extrabold text-brand-navy shadow-sm">
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
                      {image.size > 0 ? `${(image.size / 1024 / 1024).toFixed(1)} MB` : (image.isExisting ? 'Saved' : '')}
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
                This is how your updated design will look in the catalogue.
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
                <p className="mt-0.5 text-xs font-mono text-brand-navy/55">Design #{designNumber}</p>
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
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-brand-border bg-white p-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={submitting || deleting}
          onClick={() => setShowDeleteModal(true)}
          className="flex h-12 items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-6 text-sm font-extrabold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-60"
        >
          <Trash2 size={18} /> Delete Design
        </button>

        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={submitting || deleting}
            onClick={() => navigate(`/product/${product.id}`)}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand-card px-6 text-base font-semibold text-brand-navy hover:bg-brand-border disabled:opacity-60 sm:min-w-[140px]"
          >
            <X size={20} /> Cancel
          </button>
          <button
            type="button"
            disabled={submitting || deleting}
            onClick={submit}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand-lime px-8 text-base font-extrabold text-brand-navy hover:bg-[#b5e03b] disabled:opacity-60 sm:min-w-[180px]"
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving Changes…
              </>
            ) : (
              <>
                <Save size={20} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl border border-brand-border bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="font-display text-xl font-extrabold text-brand-navy">
                  Delete Product Design
                </h3>
                <p className="font-mono text-xs font-bold text-brand-navy/60">
                  #{designNumber} · {title}
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-brand-navy/80">
              Are you sure you want to permanently delete this design? This action cannot be undone. The product and all its associated images will be deleted.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError('');
                }}
                className="flex h-11 items-center justify-center rounded-full border border-brand-border px-5 text-sm font-bold text-brand-navy hover:bg-brand-card disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteProduct}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-extrabold text-white shadow-md hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
