import React, { useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function Lightbox({ photo, onClose, onPrev, onNext, hasPrev, hasNext }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext]);

  if (!photo) return null;

  const downloadUrl = `/api/photos/${photo.id}/download`;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col justify-between">
      {/* Top Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs uppercase tracking-wider text-[#ababab]">
            {photo.original_filename}
          </span>
          {photo.score && (
            <span className="kicker text-[10px] bg-[#f00000]/15 text-[#f00000] border border-[#f00000]/30 px-3 py-1 rounded-full">
              [CORRESPONDANCE : {Math.round(photo.score * 100)}%]
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={downloadUrl}
            download
            className="godthic-pill-red"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            TÉLÉCHARGER HD
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-white/15 text-[#ababab] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-6 overflow-hidden">
        {hasPrev && (
          <button
            onClick={onPrev}
            className="absolute left-6 z-10 p-3.5 rounded-full border border-white/20 bg-black/60 hover:bg-white hover:text-black text-white transition hover:scale-105"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={photo.file_path_web || photo.file_path_hd}
          alt={photo.original_filename}
          className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-2xl select-none border border-white/10"
        />

        {hasNext && (
          <button
            onClick={onNext}
            className="absolute right-6 z-10 p-3.5 rounded-full border border-white/20 bg-black/60 hover:bg-white hover:text-black text-white transition hover:scale-105"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="px-6 py-3 flex items-center justify-between text-[11px] font-mono text-[#777] border-t border-white/10 bg-black">
        <span>GODTHIC // ARCHIVE VISUELLE HAUTE FIDÉLITÉ</span>
        <span>NAVIGATION CLAVIER : FLÈCHES GAUCHE / DROITE</span>
      </div>
    </div>
  );
}
