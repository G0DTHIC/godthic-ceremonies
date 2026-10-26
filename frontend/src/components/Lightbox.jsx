import React, { useEffect, useState, useRef } from 'react';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function Lightbox({ 
  photo, 
  photos = [], 
  currentIndex = 0, 
  onClose, 
  onPrev, 
  onNext, 
  hasPrev, 
  hasNext,
  onSelectIndex
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const thumbnailContainerRef = useRef(null);

  // Preload adjacent images for instantaneous transitions
  useEffect(() => {
    if (photos.length === 0) return;
    const preloadList = [currentIndex - 1, currentIndex + 1];
    preloadList.forEach(idx => {
      if (idx >= 0 && idx < photos.length) {
        const img = new Image();
        img.src = photos[idx].file_path_web || photos[idx].file_path_hd;
      }
    });
  }, [currentIndex, photos]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) {
        setIsZoomed(false);
        onPrev();
      }
      if (e.key === 'ArrowRight' && hasNext) {
        setIsZoomed(false);
        onNext();
      }
      if (e.key === 'z' || e.key === 'Z') {
        setIsZoomed(z => !z);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, onClose, onPrev, onNext]);

  // Auto-scroll thumbnail bar to keep current photo in view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const activeThumb = thumbnailContainerRef.current.children[currentIndex];
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  // Touch Swipe handlers for mobile
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const dx = touchStart.x - touchEnd.x;
    const dy = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;

    // Horizontal swipe (Next / Prev)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipeDistance) {
      if (dx > 0 && hasNext) {
        setIsZoomed(false);
        onNext();
      } else if (dx < 0 && hasPrev) {
        setIsZoomed(false);
        onPrev();
      }
    }
    // Swipe down to close
    else if (dy < -80 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
    }
  };

  if (!photo) return null;

  const downloadUrl = `/api/photos/${photo.id}/download`;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col justify-between select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Navigation Bar */}
      <div className="px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-white/10 bg-black/70 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
            {photos.length > 0 ? `PHOTO ${currentIndex + 1} / ${photos.length}` : photo.original_filename}
          </span>
          {photo.score && (
            <span className="hidden sm:inline-block kicker text-[10px] bg-[#f00000]/15 text-[#f00000] border border-[#f00000]/30 px-2.5 py-0.5 rounded-full">
              CORRESPONDANCE {Math.round(photo.score * 100)}%
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zoom toggle button */}
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-white transition flex items-center gap-1.5 text-xs font-mono"
            title="Agrandir / Réduire (Z)"
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            <span className="hidden md:inline">{isZoomed ? 'DÉZOOMER' : 'ZOOMER'}</span>
          </button>

          {/* Download button */}
          <a
            href={downloadUrl}
            download
            className="godthic-pill-red text-xs py-1.5 px-4"
            title="Télécharger la photo en qualité maximale originale"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span className="hidden sm:inline">TÉLÉCHARGER HD</span>
            <span className="sm:hidden">HD</span>
          </a>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-white/15 text-[#ababab] hover:text-white hover:bg-white/10 transition"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Previous Arrow */}
        {hasPrev && (
          <button
            onClick={() => {
              setIsZoomed(false);
              onPrev();
            }}
            className="absolute left-2 sm:left-6 z-20 p-3 sm:p-4 rounded-full border border-white/20 bg-black/60 hover:bg-white hover:text-black text-white transition hover:scale-110 active:scale-95 shadow-2xl"
            title="Photo précédente"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Display Image with Smooth Zoom */}
        <div 
          className={`relative max-h-full max-w-full flex items-center justify-center transition-transform duration-300 ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
          }`}
          onDoubleClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={photo.file_path_web || photo.file_path_hd}
            alt={photo.original_filename}
            className="max-h-[72vh] sm:max-h-[76vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
            draggable={false}
          />
        </div>

        {/* Next Arrow */}
        {hasNext && (
          <button
            onClick={() => {
              setIsZoomed(false);
              onNext();
            }}
            className="absolute right-2 sm:right-6 z-20 p-3 sm:p-4 rounded-full border border-white/20 bg-black/60 hover:bg-white hover:text-black text-white transition hover:scale-110 active:scale-95 shadow-2xl"
            title="Photo suivante"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip for Fast & Easy Previewing */}
      {photos.length > 1 && (
        <div className="px-4 py-2.5 bg-black/90 border-t border-white/10 z-20">
          <div 
            ref={thumbnailContainerRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 max-w-4xl mx-auto"
          >
            {photos.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  setIsZoomed(false);
                  if (onSelectIndex) onSelectIndex(idx);
                }}
                className={`relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex 
                    ? 'border-[#f00000] scale-105 shadow-[0_0_12px_rgba(240,0,0,0.6)]' 
                    : 'border-white/15 opacity-50 hover:opacity-100 hover:border-white/50'
                }`}
              >
                <img 
                  src={p.file_path_thumb || p.file_path_web || p.file_path_hd} 
                  alt="" 
                  className="w-full h-full object-cover" 
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-6 py-2 flex items-center justify-between text-[10px] font-mono text-[#666] border-t border-white/5 bg-black z-20">
        <span className="hidden sm:inline">GLISSEZ SUR MOBILE // FLÈCHES CLAVIER SUR PC</span>
        <span>DOUBLE-CLIC POUR AGRANDIR // GODTHIC HD</span>
      </div>
    </div>
  );
}
