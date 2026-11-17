import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, SplitSquareVertical, Sparkles } from 'lucide-react';

interface PreviewControlsProps {
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
  showComparison: boolean;
  onToggleComparison: () => void;
  sliderPos: number;
  onSliderChange: (val: number) => void;
  finish: 'Matte' | 'Glossy';
  onFinishChange: (finish: 'Matte' | 'Glossy') => void;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({
  zoom,
  onZoomChange,
  onResetZoom,
  showComparison,
  onToggleComparison,
  sliderPos,
  onSliderChange,
  finish,
  onFinishChange,
}) => {
  return (
    <div className="bg-[#171A35] text-white p-4 rounded-3xl shadow-lg border border-white/10 flex flex-wrap items-center justify-between gap-4">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-gray-300 font-display">Zoom:</span>
        <button
          type="button"
          onClick={() => onZoomChange(Math.max(1, zoom - 0.2))}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Zoom out"
          disabled={zoom <= 1}
        >
          <ZoomOut size={15} />
        </button>

        <span className="text-xs font-mono font-bold w-12 text-center text-brand-lime">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={() => onZoomChange(Math.min(2.2, zoom + 0.2))}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Zoom in"
          disabled={zoom >= 2.2}
        >
          <ZoomIn size={15} />
        </button>

        {zoom !== 1 && (
          <button
            type="button"
            onClick={onResetZoom}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors ml-1"
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Compare Mode Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleComparison}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            showComparison
              ? 'bg-brand-lime text-brand-navy shadow-sm'
              : 'bg-white/10 text-gray-200 hover:bg-white/20'
          }`}
        >
          <SplitSquareVertical size={14} />
          <span>{showComparison ? 'Exit Compare' : 'Compare Original vs Skin'}</span>
        </button>

        {showComparison && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Original</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => onSliderChange(Number(e.target.value))}
              className="w-24 h-1.5 accent-brand-lime bg-white/20 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-brand-lime font-bold">Skin</span>
          </div>
        )}
      </div>

      {/* Skin Finish Switcher */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-gray-300 font-display flex items-center gap-1">
          <Sparkles size={13} className="text-brand-yellow" />
          Finish:
        </span>
        <div className="flex p-0.5 rounded-full bg-white/10">
          <button
            type="button"
            onClick={() => onFinishChange('Matte')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              finish === 'Matte' ? 'bg-brand-lime text-brand-navy' : 'text-gray-300 hover:text-white'
            }`}
          >
            Matte
          </button>
          <button
            type="button"
            onClick={() => onFinishChange('Glossy')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              finish === 'Glossy' ? 'bg-brand-orange text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            Glossy
          </button>
        </div>
      </div>
    </div>
  );
};
