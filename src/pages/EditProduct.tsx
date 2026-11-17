import React, { DragEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, UploadCloud, GripVertical, ImagePlus, Save, Star, Trash2 } from 'lucide-react';
import { PRODUCTS } from '../data/products';
import { CATEGORIES } from '../data/categories';
import { CategoryType } from '../types/product';

type GalleryImage = { id: string; src: string; name: string; info: string; local: boolean };

const Toggle: React.FC<{ label: string; detail: string; checked: boolean; onChange: () => void; icon?: React.ReactNode }> = ({ label, detail, checked, onChange, icon }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-border px-4 py-3.5">
    <div className="flex items-center gap-3">{icon && <span className="text-brand-navy/70">{icon}</span>}<div><p className="text-sm font-bold text-brand-navy">{label}</p><p className="text-xs text-brand-navy/55">{detail}</p></div></div>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-lime' : 'bg-gray-200'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} /></button>
  </div>
);

export const EditProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = PRODUCTS.find((item) => item.id === id);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const [title, setTitle] = useState(product?.name ?? '');
  const [category, setCategory] = useState<CategoryType>(product?.category ?? 'Cars');
  const [description, setDescription] = useState(product?.description ?? '');
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [bestseller, setBestseller] = useState(product?.badge?.toLowerCase().includes('bestseller') ?? false);
  const [images, setImages] = useState<GalleryImage[]>(() => product ? (product.images?.length ? product.images : [product.image]).map((src, index) => ({ id: `existing-${index}-${src}`, src, name: index === 0 ? `${product.name} primary image` : `${product.name} image ${index + 1}`, info: 'Catalogue image', local: false })) : []);
  const [primaryId, setPrimaryId] = useState(images[0]?.id ?? '');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  if (!product) return <div className="mx-auto max-w-3xl py-20 text-center"><h1 className="font-display text-3xl font-bold text-brand-navy">Product not found</h1><p className="mt-2 text-brand-navy/60">This design may have been removed from the catalogue.</p><Link to="/catalog" className="mt-6 inline-flex rounded-full bg-brand-lime px-5 py-3 font-bold text-brand-navy">Back to Catalog</Link></div>;

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const accepted = Array.from(fileList).filter((file) => /image\/(jpeg|png|webp)/.test(file.type));
    const additions = accepted.map((file) => {
      const src = URL.createObjectURL(file);
      objectUrls.current.push(src);
      return { id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`, src, name: file.name, info: `${(file.size / 1024 / 1024).toFixed(1)} MB · ${file.type.split('/')[1].toUpperCase()}`, local: true };
    });
    setImages((current) => {
      const next = [...current, ...additions];
      if (!primaryId && additions[0]) setPrimaryId(additions[0].id);
      return next;
    });
    if (fileList.length !== accepted.length) setNotice('Some files were skipped. Choose JPG, PNG, or WebP images.');
    else if (additions.length) setNotice(`${additions.length} image${additions.length === 1 ? '' : 's'} added as local previews.`);
  };

  const removeImage = (image: GalleryImage) => {
    if (image.local) {
      URL.revokeObjectURL(image.src);
      objectUrls.current = objectUrls.current.filter((url) => url !== image.src);
    }
    setImages((current) => {
      const next = current.filter((item) => item.id !== image.id);
      if (primaryId === image.id) setPrimaryId(next[0]?.id ?? '');
      return next;
    });
  };

  const reorder = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setImages((current) => {
      const next = [...current];
      const from = next.findIndex((item) => item.id === draggingId);
      const to = next.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDraggingId(null);
  };

  const saveDemo = () => {
    const validation: string[] = [];
    if (!title.trim()) validation.push('Add a product title.');
    if (!description.trim()) validation.push('Add a product description.');
    if (!images.length) validation.push('Add at least one product image.');
    setErrors(validation);
    setNotice(validation.length ? '' : 'Demo saved for this session. Changes have not been sent or saved to the catalogue.');
  };

  const dropFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    addFiles(event.dataTransfer.files);
  };

  return <div className="mx-auto max-w-[1280px] px-0 py-5 sm:py-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link to={`/product/${product.id}`} className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2.5 text-sm font-bold text-brand-navy transition-colors hover:bg-brand-border"><ArrowLeft size={17} /> Back to Product</Link>
      <span className="rounded-full bg-brand-lime/20 px-3 py-1.5 text-xs font-bold text-brand-navy">Frontend demo · Changes are temporary</span>
    </div>
    <div className="mb-7"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-navy/45">Product management</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Edit Product Design</h1><p className="mt-2 text-sm text-brand-navy/60 sm:text-base">Manage your product details and gallery.</p></div>

    <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
      <section className="rounded-3xl border border-brand-border bg-white p-5 shadow-card sm:p-7">
        <div className="mb-6"><h2 className="font-display text-xl font-bold text-brand-navy">Product information</h2><p className="mt-1 text-sm text-brand-navy/55">Keep the design details clear and easy to find.</p></div>
        <div className="space-y-5">
          <label className="block"><span className="mb-2 block text-sm font-bold text-brand-navy">Product title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. GT Racing" className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm font-bold text-brand-navy">Product category</span><select value={category} onChange={(event) => setCategory(event.target.value as CategoryType)} className="w-full rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-navy outline-none focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30">{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-sm font-bold text-brand-navy">Design number</span><div className="flex w-full items-center rounded-xl border border-brand-border bg-brand-card px-4 py-3 text-sm font-bold text-brand-navy/65">#{product.designNumber.padStart(3, '0')} <span className="ml-auto text-xs font-medium">Read only</span></div></label>
          </div>
          <label className="block"><span className="mb-2 block text-sm font-bold text-brand-navy">Product description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="Describe the artwork and what makes this design special..." className="w-full resize-y rounded-xl border border-brand-border bg-white px-4 py-3 text-sm leading-relaxed text-brand-navy outline-none transition focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/30" /><span className="mt-1 block text-right text-xs text-brand-navy/45">{description.length} characters</span></label>
          <div className="space-y-3"><Toggle label="Featured design" detail="Show this design in featured collections." checked={featured} onChange={() => setFeatured((value) => !value)} /><Toggle label="Bestseller" detail="Mark this design as a catalogue bestseller." checked={bestseller} onChange={() => setBestseller((value) => !value)} icon={<Star size={18} />}/></div>
        </div>
      </section>

      <section className="rounded-3xl border border-brand-border bg-white p-5 shadow-card sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-display text-xl font-bold text-brand-navy">Product image gallery</h2><p className="mt-1 text-sm text-brand-navy/55">Add, arrange, and choose the first image customers see.</p></div><span className="rounded-full bg-brand-card px-3 py-1.5 text-xs font-bold text-brand-navy">{images.length} {images.length === 1 ? 'image' : 'images'}</span></div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
        <div onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={dropFiles} onClick={() => inputRef.current?.click()} className={`mb-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition ${dragOver ? 'border-brand-lime bg-brand-lime/10' : 'border-brand-border bg-brand-card/50 hover:border-brand-lime hover:bg-brand-lime/5'}`}>
          <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-lime/35 text-brand-navy"><UploadCloud size={25} /></span><p className="text-sm font-bold text-brand-navy">Drop images here or <span className="underline decoration-brand-lime decoration-2 underline-offset-2">browse files</span></p><p className="mt-1 text-xs text-brand-navy/55">JPG, PNG, or WebP · Select multiple images</p>
        </div>
        {images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image, index) => <div key={image.id} draggable onDragStart={() => setDraggingId(image.id)} onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); reorder(image.id); }} className={`group relative overflow-hidden rounded-2xl border bg-white transition ${draggingId === image.id ? 'opacity-50' : ''} ${primaryId === image.id ? 'border-brand-lime ring-2 ring-brand-lime/40' : 'border-brand-border'}`}>
          <div className="relative aspect-[4/3] bg-brand-card"><img src={image.src} alt={image.name} className="h-full w-full object-contain" /><span className="absolute left-2 top-2 grid h-8 w-8 cursor-grab place-items-center rounded-lg bg-white/95 text-brand-navy shadow-sm" title="Drag to reorder"><GripVertical size={17} /></span>{primaryId === image.id && <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-brand-lime px-2.5 py-1 text-[10px] font-extrabold text-brand-navy"><Check size={12} /> Primary</span>}<button type="button" onClick={() => removeImage(image)} aria-label={`Remove ${image.name}`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/95 text-brand-navy shadow-sm hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div>
          <div className="p-2.5"><p className="truncate text-xs font-bold text-brand-navy" title={image.name}>{image.name}</p><p className="mt-0.5 truncate text-[10px] text-brand-navy/50">{image.info}</p><button type="button" onClick={() => setPrimaryId(image.id)} disabled={primaryId === image.id} className="mt-2 w-full rounded-lg border border-brand-border px-2 py-1.5 text-[11px] font-bold text-brand-navy transition hover:border-brand-lime disabled:border-transparent disabled:bg-brand-card disabled:text-brand-navy/50">{primaryId === image.id ? 'Main image' : 'Make primary'}</button></div>
        </div>)}</div> : <div className="rounded-2xl border border-dashed border-brand-border py-8 text-center"><ImagePlus size={25} className="mx-auto text-brand-navy/35" /><p className="mt-2 text-sm font-semibold text-brand-navy/60">No images added yet</p></div>}
        <p className="mt-4 rounded-xl bg-brand-card px-3.5 py-3 text-xs leading-relaxed text-brand-navy/60">Images are temporary previews in this browser session. Saving will not upload or change the catalogue.</p>
      </section>
    </div>

    {(errors.length > 0 || notice) && <div role="status" className={`mt-6 rounded-2xl px-4 py-3 text-sm font-medium ${errors.length ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-brand-lime/60 bg-brand-lime/15 text-brand-navy'}`}>{errors.length ? <ul className="list-inside list-disc">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : notice}</div>}
    <div className="sticky bottom-3 z-10 mt-7 flex flex-col-reverse items-stretch justify-between gap-3 rounded-2xl border border-brand-border bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center"><p className="hidden pl-2 text-xs text-brand-navy/50 sm:block">Demo mode · Nothing is published or permanently saved.</p><div className="flex gap-3"><button type="button" onClick={() => navigate(`/product/${product.id}`)} className="flex-1 rounded-full border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy hover:bg-brand-card sm:flex-none">Cancel</button><button type="button" onClick={saveDemo} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-lime px-6 py-3 text-sm font-extrabold text-brand-navy shadow-neo-sm hover:bg-[#b5e03b] sm:flex-none"><Save size={17} /> Save Changes</button></div></div>
  </div>;
};
