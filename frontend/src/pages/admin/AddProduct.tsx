import React, { DragEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, UploadCloud, Crown, Eye, GripVertical, Image as ImageIcon,
  ImagePlus, Info, Layers, Plus, Sparkles, Star, Upload, X,
} from 'lucide-react';
import { CATEGORIES } from '@/features/catalog/data/categories';
import { PRODUCTS } from '@/features/catalog/data/products';
import { CategoryType } from '@/features/catalog/types/product';

type NewImage = { id: string; src: string; name: string; size: number };
const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const nextDesignNumber = String(Math.max(0, ...PRODUCTS.map((product) => Number.parseInt(product.designNumber, 10) || 0)) + 1).padStart(3, '0');

const SwitchRow: React.FC<{ title: string; detail: string; checked: boolean; onToggle: () => void; icon: React.ReactNode; iconClass: string }> = ({ title, detail, checked, onToggle, icon, iconClass }) => (
  <div className="flex items-center gap-3 rounded-[20px] border border-brand-border px-3.5 py-2.5 sm:px-4">
    <span className={iconClass}>{icon}</span>
    <div className="min-w-0 flex-1"><p className="text-sm font-extrabold leading-tight text-brand-navy">{title}</p><p className="mt-1 text-xs leading-tight text-brand-navy/65">{detail}</p></div>
    <button type="button" role="switch" aria-checked={checked} aria-label={title} onClick={onToggle} className={`relative h-8 w-14 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-brand-lime' : 'bg-gray-200'}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-7' : 'left-1'}`} /></button>
  </div>
);

export const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Exclude<CategoryType, 'All'> | ''>('');
  const [description, setDescription] = useState('');
  const [featured, setFeatured] = useState(true);
  const [bestseller, setBestseller] = useState(false);
  const [images, setImages] = useState<NewImage[]>([]);
  const [primaryId, setPrimaryId] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const addFiles = (files: FileList | File[]) => {
    const selected = Array.from(files);
    const remaining = MAX_IMAGES - images.length;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of selected) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) rejected.push(`${file.name}: use JPG, PNG, or WebP.`);
      else if (file.size > MAX_FILE_SIZE) rejected.push(`${file.name}: files must be 5 MB or smaller.`);
      else if (accepted.length >= remaining) rejected.push(`${file.name}: the gallery can contain up to ${MAX_IMAGES} images.`);
      else accepted.push(file);
    }
    const additions = accepted.map((file) => {
      const src = URL.createObjectURL(file);
      objectUrls.current.push(src);
      return { id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, src, name: file.name, size: file.size };
    });
    if (additions.length) {
      setImages((current) => [...current, ...additions]);
      setPrimaryId((current) => current || additions[0].id);
    }
    setNotice(rejected.length ? rejected.join(' ') : additions.length ? `${additions.length} image${additions.length === 1 ? '' : 's'} added as local previews.` : '');
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

  const submit = () => {
    const nextErrors: string[] = [];
    if (!title.trim()) nextErrors.push('Enter a product title.');
    if (!category) nextErrors.push('Choose a category.');
    if (!description.trim()) nextErrors.push('Add a short description.');
    setErrors(nextErrors);
    setNotice(nextErrors.length ? '' : 'Design details are ready. This frontend demo has not saved or published them.');
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    addFiles(event.dataTransfer.files);
  };
  const primary = images.find((image) => image.id === primaryId);

  return <div className="mx-auto max-w-[1450px] py-4 sm:py-5">
    <Link to="/catalogue" className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2 text-sm font-bold text-brand-navy transition hover:bg-brand-border"><ArrowLeft size={17} /> Back to Catalog</Link>
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-lime/35 text-brand-navy"><ImageIcon size={28} /></span>
      <div><h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">Add New Design</h1><p className="mt-1 text-sm text-brand-navy/70 sm:text-base">Create a new design for your catalogue.</p></div>
    </div>

    <div className="grid items-stretch gap-5 lg:grid-cols-[0.86fr_1.24fr] xl:gap-7">
      <section className="rounded-2xl border border-brand-border bg-white p-4 sm:p-5">
        <h2 className="mb-5 flex items-center gap-2.5 font-display text-xl font-extrabold text-brand-navy"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-card"><Info size={22} /></span>Design Information</h2>
        <div className="space-y-3.5">
          <label className="block"><span className="mb-1.5 block text-sm font-extrabold text-brand-navy">Product Title <b className="text-red-500">*</b></span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Cosmic Astronaut" className="h-[43px] w-full rounded-xl border border-[#c8ccd6] px-3.5 text-sm text-brand-navy outline-none placeholder:text-brand-navy/65 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-extrabold text-brand-navy">Category <b className="text-red-500">*</b></span><select value={category} onChange={(event) => setCategory(event.target.value as Exclude<CategoryType, 'All'> | '')} className="h-[43px] w-full rounded-xl border border-[#c8ccd6] bg-white px-3.5 text-sm text-brand-navy outline-none focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25"><option value="">Select a category</option>{CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div><span className="mb-1.5 block text-sm font-extrabold text-brand-navy">Design Number <b className="text-red-500">*</b></span><div className="flex h-[43px] items-center rounded-xl border border-brand-border bg-brand-card px-3.5"><span className="text-sm font-medium text-brand-navy/70">#{nextDesignNumber}</span><span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-navy"><Sparkles size={15} className="text-brand-lime" />Auto-generated</span></div><p className="mt-1 text-xs text-brand-navy/65">A unique design number for this product.</p></div>
          <label className="block"><span className="mb-1.5 block text-sm font-extrabold text-brand-navy">Description <b className="text-red-500">*</b></span><textarea value={description} maxLength={300} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Write a short description for this design..." className="w-full resize-y rounded-xl border border-[#c8ccd6] px-3.5 py-2.5 text-sm leading-relaxed text-brand-navy outline-none placeholder:text-brand-navy/65 focus:border-brand-lime focus:ring-2 focus:ring-brand-lime/25" /><p className="mt-0.5 text-right text-xs text-brand-navy/70">{description.length} / 300</p></label>
          <div className="space-y-2">
            <SwitchRow title="Featured Design" detail={'Show a "Featured Design" badge on this design.'} checked={featured} onToggle={() => setFeatured((value) => !value)} icon={<Sparkles size={26} />} iconClass="text-brand-lime" />
            <SwitchRow title="Bestseller" detail={'Show a "Bestseller" badge on this design.'} checked={bestseller} onToggle={() => setBestseller((value) => !value)} icon={<Crown size={26} />} iconClass="text-amber-400" />
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl border border-brand-border bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3"><Layers size={29} className="mt-0.5 flex-shrink-0 text-brand-navy" /><div><h2 className="font-display text-xl font-extrabold leading-tight text-brand-navy">Product Images</h2><p className="mt-1 text-sm text-brand-navy/70">Upload up to 8 images · JPG, PNG, WEBP</p></div></div>
            <span className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-brand-card px-3 py-2 text-xs font-bold text-brand-navy"><ImageIcon size={17} />{images.length} / 8 Images</span>
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.currentTarget.value = ''; }} />
          <div onClick={() => fileInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} className={`flex min-h-[156px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-4 text-center transition sm:min-h-[184px] ${dragOver ? 'border-brand-lime bg-brand-lime/15' : 'border-[#aeb5c2] bg-[#fbfdf6] hover:border-brand-lime'}`}>
            <UploadCloud size={44} strokeWidth={1.7} className="mb-1 text-brand-navy" /><p className="text-base font-extrabold text-brand-navy">Choose images or drag them here</p><p className="mt-1 text-xs text-brand-navy/75">JPG, PNG or WEBP · Max 5 MB per image</p><button type="button" onClick={(event) => { event.stopPropagation(); fileInput.current?.click(); }} className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-lime px-5 py-2 text-sm font-extrabold text-brand-navy shadow-sm hover:bg-[#b5e03b]"><Upload size={17} /> Choose Images</button>
          </div>
          {images.length > 0 ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => <div key={image.id} draggable onDragStart={() => setDraggingId(image.id)} onDragEnd={() => setDraggingId(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); reorderImage(image.id); }} className={`group relative overflow-hidden rounded-xl border-2 bg-brand-card transition ${draggingId === image.id ? 'opacity-50' : ''} ${primaryId === image.id ? 'border-brand-lime' : 'border-transparent'}`}>
              <button type="button" onClick={() => setPrimaryId(image.id)} aria-label="Select primary image" className="block aspect-[1.28] w-full cursor-pointer"><img src={image.src} alt={image.name} className="h-full w-full object-cover" /></button>
              {primaryId === image.id && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand-lime px-2.5 py-1 text-[10px] font-extrabold text-brand-navy">Primary <Star size={11} className="fill-current" /></span>}
              <span className="absolute bottom-1.5 left-1.5 grid h-7 w-7 cursor-grab place-items-center rounded-lg bg-white/95 text-brand-navy shadow-sm" title="Drag to reorder"><GripVertical size={17} /></span>
              <button type="button" onClick={() => removeImage(image)} aria-label={`Remove ${image.name}`} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-brand-navy shadow-sm hover:text-red-600"><X size={18} /></button>
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">{(image.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>)}
            {images.length < MAX_IMAGES && <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-[1.28] flex-col items-center justify-center rounded-xl border border-dashed border-[#adb5c6] text-brand-navy transition hover:border-brand-lime hover:bg-brand-lime/5"><Plus size={31} strokeWidth={1.6} /><span className="mt-1 text-sm font-semibold">Add Image</span></button>}
          </div> : <button type="button" onClick={() => fileInput.current?.click()} className="mt-4 flex h-[112px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#adb5c6] text-brand-navy/70 hover:border-brand-lime hover:text-brand-navy"><Plus size={29} /><span className="mt-1 text-sm font-medium">Add Image</span></button>}
          <p className="mt-3 flex items-center gap-2 text-xs text-brand-navy/70"><Info size={17} />Select a primary image and arrange gallery order by dragging.</p>
        </section>

        <section className="grid gap-4 rounded-2xl border border-[#deebd0] bg-[#f6fbea] p-4 sm:grid-cols-[0.7fr_1.3fr] sm:items-center sm:p-5">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-3 py-1.5 text-xs font-extrabold text-brand-navy"><Eye size={17} />Live Preview</span><p className="mt-3 text-sm leading-relaxed text-brand-navy/75">This is how your design will look in the catalogue.</p></div>
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-card sm:p-3.5">
            <div className="h-[96px] w-[38%] flex-shrink-0 overflow-hidden rounded-xl bg-brand-card sm:h-[118px]">{primary ? <img src={primary.src} alt="Design preview" className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-brand-navy/25"><ImagePlus size={34} /></div>}</div>
            <div className="min-w-0 flex-1"><span className="inline-flex max-w-full truncate rounded-full bg-[#ffe4d9] px-2.5 py-1 text-[10px] font-bold text-brand-navy">{category || 'Category'}</span><h3 className="mt-1.5 truncate font-display text-base font-extrabold text-brand-navy sm:text-lg">{title.trim() || 'Your design title'}</h3><p className="mt-0.5 text-xs text-brand-navy/55">Design #{nextDesignNumber}</p><p className="mt-1 line-clamp-2 text-[10px] leading-snug text-brand-navy/55">{description || 'Your design description will appear here.'}</p></div>
          </div>
        </section>
      </div>
    </div>

    {(errors.length > 0 || notice) && <div role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${errors.length ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-brand-lime/50 bg-brand-lime/15 text-brand-navy'}`}>{errors.length ? <ul className="list-inside list-disc">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : notice}</div>}
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-brand-border bg-white p-3 sm:flex-row">
      <button type="button" onClick={() => navigate('/catalogue')} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-card text-base font-semibold text-brand-navy hover:bg-brand-border"><X size={20} />Cancel</button>
      <button type="button" onClick={submit} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-lime text-base font-extrabold text-brand-navy hover:bg-[#b5e03b]"><Check size={22} strokeWidth={2.5} />Create Design</button>
    </div>
    <p className="mt-2 text-center text-[11px] text-brand-navy/45">Frontend demo only · Images are temporary browser previews and will not be published.</p>
  </div>;
};
