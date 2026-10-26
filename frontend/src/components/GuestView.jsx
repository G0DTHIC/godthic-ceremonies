import React, { useState, useEffect } from 'react';
import { Camera, Upload, Sparkles, Download, ArrowLeft, Image as ImageIcon, ShieldCheck, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import CameraCapture from './CameraCapture';
import Lightbox from './Lightbox';

export default function GuestView({ eventSlug, initialMatchedPhotos = null, onBack }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search state
  const [showCamera, setShowCamera] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchResults, setSearchResults] = useState(initialMatchedPhotos);
  const [searchMessage, setSearchMessage] = useState(
    initialMatchedPhotos && initialMatchedPhotos.length > 0 
      ? `${initialMatchedPhotos.length} photo(s) identifiée(s) pour votre profil.` 
      : ''
  );
  const [selfiePreview, setSelfiePreview] = useState(null);

  // Active tab: 'matches' (Mes photos) or 'all' (Toutes les photos)
  const [activeTab, setActiveTab] = useState(initialMatchedPhotos && initialMatchedPhotos.length > 0 ? 'matches' : 'all');

  // Full gallery
  const [allPhotos, setAllPhotos] = useState([]);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Lightbox
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, [eventSlug]);

  useEffect(() => {
    if (initialMatchedPhotos && initialMatchedPhotos.length > 0) {
      setSearchResults(initialMatchedPhotos);
      setActiveTab('matches');
    }
  }, [initialMatchedPhotos]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventSlug}`);
      if (!res.ok) throw new Error("Événement introuvable");
      const data = await res.json();
      setEvent(data);

      const pRes = await fetch(`/api/events/${eventSlug}/photos`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setAllPhotos(pData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelfieCapture = async (dataUrl) => {
    setShowCamera(false);
    setSelfiePreview(dataUrl);
    await performFaceSearch(dataUrl);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      setSelfiePreview(dataUrl);
      await performFaceSearch(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const performFaceSearch = async (base64Image) => {
    setAnalyzing(true);
    setSearchResults(null);
    setSearchMessage('');

    try {
      const formData = new FormData();
      formData.append('selfie_base64', base64Image);
      // Strict matching threshold 0.44 to prevent false likeness
      formData.append('threshold', '0.44');

      const res = await fetch(`/api/events/${eventSlug}/search-by-face`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setSearchResults(data.matches || []);
      setSearchMessage(data.message || '');
      setActiveTab('matches');

      if (data.matches && data.matches.length > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f00000', '#ffffff', '#222222']
        });
      }
    } catch (err) {
      console.error(err);
      setSearchMessage("Erreur lors de l'analyse du visage.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadZip = async (photoList) => {
    if (!photoList || photoList.length === 0) return;
    try {
      setDownloadingZip(true);
      const res = await fetch(`/api/events/${eventSlug}/download-zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_ids: photoList.map(p => p.id)
        })
      });

      if (!res.ok) throw new Error("Erreur de téléchargement");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventSlug}-godthic-hd.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors de la création de l'archive ZIP : " + err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-[#ababab] font-mono text-xs">
        <div className="animate-spin w-8 h-8 border-2 border-[#f00000] border-t-transparent rounded-full mb-3"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-black">
        <h2 className="text-3xl font-bold uppercase tracking-[-0.05em] text-white mb-2">Cérémonie introuvable</h2>
        <p className="text-xs text-[#ababab] mb-6">Le lien suivi est introuvable ou a été archivé.</p>
        <button
          onClick={onBack}
          className="godthic-pill"
        >
          RETOUR À L'ACCUEIL
        </button>
      </div>
    );
  }

  // Active photos list for grid and lightbox
  const displayedPhotos = activeTab === 'matches' ? (searchResults || []) : allPhotos;
  const currentLightboxPhoto = selectedPhotoIndex !== null ? displayedPhotos[selectedPhotoIndex] : null;

  return (
    <div className="min-h-screen bg-black text-white pb-28 presence-gradient relative">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-12 py-4 border-b border-white/15 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <img
            src="/logos/logo-godthic-metal.png"
            alt="GODTHIC"
            className="h-8 w-auto object-contain cursor-pointer hover:opacity-85 transition"
            onClick={onBack}
          />
          <span className="hidden sm:inline-block w-[1px] h-5 bg-white/20"></span>
          <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-widest text-[#ababab]">
            {event.title}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="godthic-pill text-xs py-2 px-4"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> RETOUR
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-10 px-6 sm:px-12 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <p className="kicker mb-2">
            ARCHIVE OFFICIELLE // HAUTE DÉFINITION
          </p>

          <h1 className="text-3xl sm:text-6xl font-bold tracking-[-0.075em] leading-[0.9] text-white uppercase mb-4">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-[#888]">
            {event.event_date && <span>DATE : {event.event_date}</span>}
            {event.location && <span>LIEU : {event.location}</span>}
            <span>{allPhotos.length} CLICHÉS ORIGINAUX</span>
          </div>
        </div>
      </section>

      {/* If no scan yet for this ceremony, show quick scan banner */}
      {searchResults === null && (
        <section className="max-w-2xl mx-auto px-6 mb-10">
          <div className="godthic-glass rounded-3xl p-6 sm:p-8 text-center border border-white/15">
            <p className="kicker mb-1">ISOLER MES PHOTOS</p>
            <h3 className="text-xl sm:text-2xl font-bold uppercase text-white mb-2">
              Vous êtes sur ces clichés ?
            </h3>
            <p className="text-xs text-[#ababab] mb-6">
              Lancez le scan facial automatique pour n'afficher que les photos où vous apparaissez.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCamera(true)}
                className="godthic-pill-red text-xs py-3 px-6"
              >
                <Camera className="w-4 h-4 mr-2" /> SCANNER MON VISAGE
              </button>
            </div>
          </div>
        </section>
      )}

      {/* View Switcher Tabs (Mes Photos vs Toute la cérémonie) */}
      <section className="max-w-6xl mx-auto px-6 sm:px-12 mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-full">
            {searchResults && searchResults.length > 0 && (
              <button
                onClick={() => setActiveTab('matches')}
                className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition ${
                  activeTab === 'matches'
                    ? 'bg-[#f00000] text-white font-bold shadow-[0_0_12px_rgba(240,0,0,0.5)]'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                Mes Photos ({searchResults.length})
              </button>
            )}

            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition ${
                activeTab === 'all'
                  ? 'bg-white text-black font-bold shadow-lg'
                  : 'text-[#888] hover:text-white'
              }`}
            >
              Toute la Cérémonie ({allPhotos.length})
            </button>
          </div>

          {/* Bulk Download ZIP button */}
          {displayedPhotos.length > 0 && (
            <button
              onClick={() => handleDownloadZip(displayedPhotos)}
              disabled={downloadingZip}
              className="godthic-pill-red text-xs py-2.5 px-5"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadingZip 
                ? "CRÉATION ZIP..." 
                : activeTab === 'matches' 
                  ? `TÉLÉCHARGER MES PHOTOS HD (${displayedPhotos.length})` 
                  : `TÉLÉCHARGER TOUT L'ALBUM (.ZIP)`
              }
            </button>
          )}
        </div>
      </section>

      {/* Photos Grid */}
      <section className="max-w-6xl mx-auto px-6 sm:px-12">
        {displayedPhotos.length === 0 ? (
          <div className="godthic-glass rounded-3xl p-12 text-center max-w-md mx-auto">
            <p className="text-xs text-[#ababab]">Aucune photo à afficher dans cette sélection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {displayedPhotos.map((photo, idx) => (
              <div
                key={photo.id}
                className="godthic-glass-card rounded-2xl overflow-hidden aspect-[4/5] relative cursor-pointer group border border-white/10 hover:border-[#f00000]/60 transition duration-300"
                onClick={() => setSelectedPhotoIndex(idx)}
              >
                <img
                  src={photo.file_path_thumb || photo.file_path_web || photo.file_path_hd}
                  alt={photo.original_filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  loading="lazy"
                />

                {/* Subtle Hover Action Bar */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-3">
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="truncate max-w-[100px] font-mono text-[10px] text-[#ababab]">
                      {photo.original_filename}
                    </span>
                    <a
                      href={`/api/photos/${photo.id}/download`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-full bg-[#f00000] text-white hover:bg-white hover:text-black transition"
                      title="Télécharger HD"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Match score badge if present */}
                {photo.score && (
                  <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full kicker text-[9px] text-white border border-white/20">
                    {Math.round(photo.score * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleSelfieCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Enhanced Lightbox Modal with Zoom, Swipe, and Thumbnails */}
      {selectedPhotoIndex !== null && currentLightboxPhoto && (
        <Lightbox
          photo={currentLightboxPhoto}
          photos={displayedPhotos}
          currentIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
          hasPrev={selectedPhotoIndex > 0}
          hasNext={selectedPhotoIndex < displayedPhotos.length - 1}
          onPrev={() => setSelectedPhotoIndex(i => i - 1)}
          onNext={() => setSelectedPhotoIndex(i => i + 1)}
          onSelectIndex={(idx) => setSelectedPhotoIndex(idx)}
        />
      )}
    </div>
  );
}
