import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PRODUCTS } from '@/data/products';
import { WishlistButton } from '@/components/common/WishlistButton';
import { ProductCard } from '@/components/catalogue/ProductCard';
import {
  ArrowLeft, ArrowLeft as Previous, ArrowRight, Check, Expand, Eye, Image as ImageIcon,
  Layers, Ruler, Scissors, Share2, Sparkles, Star, X, ZoomIn, ZoomOut,
} from 'lucide-react';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const product = PRODUCTS.find((item) => item.id === id) || PRODUCTS[0];
  const images = product.images?.length ? product.images : [product.image];
  const [activeImage, setActiveImage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const relatedProducts = PRODUCTS
    .filter((item) => item.id !== product.id && (item.category === product.category || item.featured))
    .slice(0, 4);

  useEffect(() => {
    setActiveImage(0);
    setZoomed(false);
  }, [product.id]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreen(false);
      if (event.key === 'ArrowRight') setActiveImage((current) => (current + 1) % images.length);
      if (event.key === 'ArrowLeft') setActiveImage((current) => (current - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [fullscreen, images.length]);

  const changeImage = (direction: number) => {
    setActiveImage((current) => (current + direction + images.length) % images.length);
    setZoomed(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product.name, url });
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const gallery = (large = false) => (
    <div className={`relative flex items-center justify-center overflow-hidden ${large ? 'h-full w-full' : 'min-h-[350px] sm:min-h-[480px] lg:min-h-[560px] rounded-[24px] border border-brand-border/70 bg-[#f5f5f5]'}`}>
      <img
        src={images[activeImage]}
        alt={`${product.name} design, view ${activeImage + 1}`}
        onClick={() => large && setZoomed((value) => !value)}
        className={`max-h-full max-w-full object-contain transition-transform duration-300 ${large ? 'h-full w-full cursor-zoom-in p-8 sm:p-12' : 'h-full w-full' } ${zoomed && large ? 'scale-150 cursor-zoom-out' : ''}`}
      />
      <span className="absolute left-5 top-5 select-none font-display text-2xl font-extrabold text-white drop-shadow-md sm:text-3xl">#{product.designNumber.padStart(3, '0')}</span>
      {product.featured && (
        <span className="absolute right-16 top-5 inline-flex items-center gap-2 rounded-full bg-brand-lime px-4 py-2 text-xs font-extrabold text-brand-navy shadow-sm sm:right-20">
          <Sparkles size={15} /> Featured Design
        </span>
      )}
      {!large && <WishlistButton productId={product.id} size="md" className="absolute right-5 top-5" />}
      {images.length > 1 && <>
        <button type="button" aria-label="Previous image" onClick={() => changeImage(-1)} className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-brand-navy shadow-md hover:bg-brand-lime"><Previous size={21} /></button>
        <button type="button" aria-label="Next image" onClick={() => changeImage(1)} className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-brand-navy shadow-md hover:bg-brand-lime"><ArrowRight size={21} /></button>
      </>}
      <div className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white">{activeImage + 1} / {images.length}</div>
      {!large && <button type="button" aria-label="Open fullscreen gallery" onClick={() => setFullscreen(true)} className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"><Expand size={18} /></button>}
      {large && <div className="absolute bottom-5 right-5 flex gap-2">
        <button type="button" aria-label="Zoom out" onClick={() => setZoomed(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-brand-navy"><ZoomOut size={19} /></button>
        <button type="button" aria-label="Zoom in" onClick={() => setZoomed(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-brand-navy"><ZoomIn size={19} /></button>
      </div>}
    </div>
  );

  return (
    <div className="bg-white px-1 py-5 sm:px-2 sm:py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/catalogue" className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-brand-border"><ArrowLeft size={18} /> Back to Catalog</Link>
        <div className="flex items-center gap-2">
          <Link to={`/admin/products/${product.id}/edit`} className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-brand-border">Edit Design</Link>
          <button type="button" onClick={handleShare} className="inline-flex items-center gap-2 rounded-full bg-brand-card px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-brand-border"><Share2 size={18} /> {copied ? 'Link Copied!' : 'Share Design'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
        <section className="space-y-4 lg:col-span-7">
          {gallery()}
          {images.length > 1 && <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Product image thumbnails">
            {images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => { setActiveImage(index); setZoomed(false); }} aria-label={`Show image ${index + 1}`} className={`h-20 min-w-[100px] overflow-hidden rounded-xl border-2 bg-[#f4f4f4] sm:h-24 sm:min-w-[120px] ${activeImage === index ? 'border-brand-lime' : 'border-transparent'}`}><img src={image} alt="" className="h-full w-full object-contain" /></button>)}
          </div>}
          <div className="grid grid-cols-3 items-center rounded-2xl border border-brand-border bg-white px-2 py-4 text-center text-[11px] font-bold text-brand-navy sm:px-4 sm:text-sm">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center"><ImageIcon size={21} /><span>High-resolution Artwork</span></div>
            <div className="flex flex-col items-center gap-2 border-x border-brand-border sm:flex-row sm:justify-center"><Layers size={21} /><span>Universal Free-size Sheet</span></div>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center"><Scissors size={21} /><span>Clean Edge Finish</span></div>
          </div>
        </section>

        <section className="space-y-6 lg:col-span-5 lg:pt-1">
          <div>
            <Link to={`/catalogue?category=${product.category}`} className="inline-flex rounded-full bg-[#fff0e9] px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-brand-navy">{product.category}</Link>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">{product.name}</h1>
            <p className="mt-1 text-lg font-semibold text-brand-navy/65">Design #{product.designNumber.padStart(3, '0')}</p>
            {product.rating != null && product.reviewCount != null && product.reviewCount > 0 && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-0.5 text-amber-400" aria-label={`${product.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={22} className="fill-current" />)}</div>
              <span className="font-semibold text-brand-navy">{product.rating.toFixed(1)}</span>
              <span className="text-brand-navy/60">({product.reviewCount} reviews)</span>
              <span className="h-6 border-l border-brand-border" />
              <span className="inline-flex items-center gap-2 text-brand-navy"><Sparkles size={18} className="text-brand-lime" /> Community favourite</span>
            </div>}
          </div>

          <p className="text-base leading-relaxed text-brand-navy/75 sm:text-lg">{product.description}</p>

          <div className="flex items-center gap-5 rounded-2xl border border-brand-border p-5">
            <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-brand-lime/35 text-brand-navy"><Ruler size={32} strokeWidth={1.8} /></span>
            <span className="h-14 border-l border-brand-border" />
            <div><h2 className="font-display text-xl font-extrabold text-brand-navy sm:text-2xl">FREE SIZE SKIN</h2><p className="mt-1 text-sm font-medium text-brand-navy">Universal sheet · Trim to fit your laptop</p></div>
          </div>
          <p className="flex items-center gap-3 text-brand-navy/70"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-lime text-brand-navy"><Check size={17} strokeWidth={3} /></span>Designed for custom fitting.</p>

          <button type="button" onClick={() => setFullscreen(true)} className="group flex w-full items-center justify-center gap-3 rounded-full bg-brand-lime px-6 py-5 text-lg font-extrabold text-brand-navy shadow-neo transition-colors hover:bg-[#b5e03b]"><Eye size={25} className="transition-transform group-hover:scale-110" /> Explore Design</button>
        </section>
      </div>

      {relatedProducts.length > 0 && <section className="mt-14 border-t border-brand-border/70 pt-9">
        <div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-xl font-bold text-brand-navy"><Sparkles size={18} className="text-brand-orange" /> You May Also Like</h2><Link to={`/catalogue?category=${product.category}`} className="text-sm font-bold text-brand-navy hover:text-brand-orange">View More {product.category} Designs →</Link></div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{relatedProducts.map((item) => <ProductCard key={item.id} product={item} variant="trending" />)}</div>
      </section>}

      {fullscreen && <div role="dialog" aria-modal="true" aria-label={`${product.name} image gallery`} className="fixed inset-0 z-[100] flex flex-col bg-black/95 p-3 sm:p-6">
        <div className="flex items-center justify-between pb-3 text-white"><div><p className="font-display text-xl font-bold">{product.name}</p><p className="text-sm text-white/65">Design #{product.designNumber.padStart(3, '0')} · {activeImage + 1} / {images.length}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => setZoomed((value) => !value)} aria-label={zoomed ? 'Zoom out' : 'Zoom in'} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20">{zoomed ? <ZoomOut size={21} /> : <ZoomIn size={21} />}</button><button type="button" onClick={() => setFullscreen(false)} aria-label="Close gallery" className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X size={23} /></button></div></div>
        <div className="min-h-0 flex-1">{gallery(true)}</div>
        {images.length > 1 && <div className="mt-3 flex justify-center gap-2 overflow-x-auto">{images.map((image, index) => <button key={`${image}-full-${index}`} type="button" onClick={() => { setActiveImage(index); setZoomed(false); }} aria-label={`Show image ${index + 1}`} className={`h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-white/10 ${activeImage === index ? 'border-brand-lime' : 'border-transparent'}`}><img src={image} alt="" className="h-full w-full object-contain" /></button>)}</div>}
      </div>}
    </div>
  );
};
