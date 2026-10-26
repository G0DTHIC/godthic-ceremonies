import React, { useState, useEffect } from 'react';
import { Camera, Upload, Sparkles, Download, ArrowLeft, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import CameraCapture from './CameraCapture';
import Lightbox from './Lightbox';

export default function GuestView({ eventSlug, onBackToAdmin }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search state
  const [showCamera, setShowCamera] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [selfiePreview, setSelfiePreview] = useState(null);

  // Full gallery
  const [allPhotos, setAllPhotos] = useState([]);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Lightbox
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [lightboxMode, setLightboxMode] = useState('matches');

  useEffect(() => {
    fetchEvent();
  }, [eventSlug]);

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
      formData.append('threshold', '0.36');

      const res = await fetch(`/api/events/${eventSlug}/search-by-face`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setSearchResults(data.matches || []);
      setSearchMessage(data.message || '');

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
          onClick={onBackToAdmin}
          className="godthic-pill"
        >
          RETOUR AU STUDIO
        </button>
      </div>
    );
  }

  const activePhotos = lightboxMode === 'matches' ? (searchResults || []) : allPhotos;
  const currentLightboxPhoto = selectedPhotoIndex !== null ? activePhotos[selectedPhotoIndex] : null;

  return (
    <div className="min-h-screen bg-black text-white pb-28 presence-gradient relative">
      {/* Navbar Style ggodthicc.com */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-12 py-4 border-b border-white/15 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <img
            src="/logos/logo-godthic-metal.png"
            alt="GODTHIC"
            className="h-8 w-auto object-contain cursor-pointer hover:opacity-85 transition"
            onClick={onBackToAdmin}
          />
          <span className="hidden sm:inline-block w-[1px] h-5 bg-white/20"></span>
          <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-widest text-[#ababab]">
            Galerie Privée
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToAdmin}
            className="godthic-pill"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> STUDIO
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-16 px-6 sm:px-12 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <p className="kicker mb-3">
            ARCHIVE OFFICIELLE // SYSTÈME BIOMÉTRIQUE
          </p>

          <h1 className="text-4xl sm:text-7xl font-bold tracking-[-0.075em] leading-[0.85] text-white uppercase mb-6">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#ababab]">
            {event.event_date && <span>DATE : {event.event_date}</span>}
            {event.location && <span>LIEU : {event.location}</span>}
            <span>{allPhotos.length} CLICHÉS HAUTE RÉSOLUTION</span>
          </div>
        </div>
      </section>

      {/* Face Search Box */}
      <section className="max-w-2xl mx-auto px-6 -mt-4 mb-16">
        <div className="godthic-glass rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="text-center mb-8">
            <p className="kicker mb-2">SCAN DU VISAGE EN 1 CLIC</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-[-0.05em] uppercase text-white">
              Retrouvez Vos Photos
            </h2>
            <p className="text-xs sm:text-sm text-[#d0d0d0] mt-3 max-w-md mx-auto leading-relaxed">
              Prenez un selfie ou importez une photo de vous. L'IA isole instantanément vos apparitions dans la cérémonie.
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setShowCamera(true)}
              disabled={analyzing}
              className="godthic-pill-red justify-center py-4 text-xs tracking-wider"
            >
              <Camera className="w-4 h-4 mr-2" />
              PRENDRE UN SELFIE
            </button>

            <label className="godthic-pill justify-center py-4 text-xs tracking-wider cursor-pointer">
              <Upload className="w-4 h-4 mr-2 text-[#ababab]" />
              <span>CHARGER UNE PHOTO</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={analyzing}
                className="hidden"
              />
            </label>
          </div>

          {/* Privacy reassurance */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#ababab] pt-4 border-t border-white/10">
            <ShieldCheck className="w-4 h-4 text-[#f00000]" />
            <span>CONFIDENTIALITÉ : Le selfie sert exclusivement à la recherche en direct et n'est jamais conservé.</span>
          </div>

          {/* Analyzing HUD line */}
          {analyzing && (
            <div className="mt-6 p-4 rounded-2xl bg-black/80 border border-[#f00000]/40 relative overflow-hidden flex items-center justify-center gap-3">
              <div className="absolute left-0 right-0 h-[2px] bg-[#f00000] shadow-[0_0_12px_#f00000] animate-scan-laser"></div>
              <div className="w-4 h-4 border-2 border-[#f00000] border-t-transparent rounded-full animate-spin"></div>
              <span className="font-mono text-xs text-[#f00000] font-bold tracking-wider">
                EXTRACTION VECTORIELLE DU VISAGE EN COURS...
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Search Results Gallery */}
      {searchResults !== null && (
        <section className="max-w-6xl mx-auto px-6 sm:px-12 mb-16">
          <div className="godthic-glass rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/10">
              <div>
                <p className="kicker">RÉSULTAT PERSONNALISÉ</p>
                <h3 className="text-3xl sm:text-5xl font-bold tracking-[-0.06em] uppercase text-white mt-1">
                  {searchResults.length > 0 ? (
                    <>✨ {searchResults.length} photo{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}</>
                  ) : (
                    "Aucune photo trouvée"
                  )}
                </h3>
                <p className="text-xs text-[#ababab] mt-2">{searchMessage}</p>
              </div>

              {searchResults.length > 0 && (
                <button
                  onClick={() => handleDownloadZip(searchResults)}
                  disabled={downloadingZip}
                  className="godthic-pill-red py-3.5 px-6"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloadingZip ? "CRÉATION DU ZIP HD..." : "TOUT TÉLÉCHARGER EN HD (.ZIP)"}
                </button>
              )}
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-[#ababab]">
                <p className="text-sm mb-4">
                  Aucun visage correspondant n'a été identifié. Essayez avec un selfie mieux éclairé et de face.
                </p>
                <button
                  onClick={() => setShowCamera(true)}
                  className="godthic-pill"
                >
                  NOUVEAU SELFIE
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {searchResults.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="godthic-glass-card rounded-2xl overflow-hidden aspect-[4/5] relative cursor-pointer group"
                    onClick={() => {
                      setLightboxMode('matches');
                      setSelectedPhotoIndex(idx);
                    }}
                  >
                    <img
                      src={photo.file_path_thumb || photo.file_path_web}
                      alt={photo.original_filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                      <div className="flex items-center justify-between text-xs text-white">
                        <span className="truncate max-w-[130px] font-mono text-[11px]">{photo.original_filename}</span>
                        <a
                          href={`/api/photos/${photo.id}/download`}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-full bg-[#f00000] text-white hover:bg-white hover:text-black transition"
                          title="Télécharger HD"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                    {photo.score && (
                      <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full kicker text-[10px] text-white border border-white/20">
                        {Math.round(photo.score * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Explore full ceremony */}
      <section className="max-w-6xl mx-auto px-6 sm:px-12">
        <div className="text-center mb-6">
          <button
            onClick={() => setShowAllPhotos(prev => !prev)}
            className="godthic-pill py-3 px-6"
          >
            <ImageIcon className="w-4 h-4 mr-2 text-[#f00000]" />
            {showAllPhotos ? "MASQUER L'ALBUM GÉNÉRAL" : `VOIR LES ${allPhotos.length} PHOTOS DE LA CÉRÉMONIE`}
          </button>
        </div>

        {showAllPhotos && (
          <div className="godthic-glass rounded-3xl p-8 sm:p-12">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
              <h4 className="text-2xl font-bold uppercase tracking-[-0.04em] text-white">
                Toutes les photos ({allPhotos.length})
              </h4>
              <button
                onClick={() => handleDownloadZip(allPhotos)}
                disabled={downloadingZip}
                className="kicker flex items-center gap-1.5 text-white hover:text-[#f00000] transition"
              >
                <Download className="w-4 h-4" /> TÉLÉCHARGER TOUT L'ALBUM (.ZIP)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allPhotos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="godthic-glass-card rounded-xl overflow-hidden aspect-square relative cursor-pointer group"
                  onClick={() => {
                    setLightboxMode('all');
                    setSelectedPhotoIndex(idx);
                  }}
                >
                  <img
                    src={photo.file_path_thumb || photo.file_path_web}
                    alt={photo.original_filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <a
                      href={`/api/photos/${photo.id}/download`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 rounded-full bg-[#f00000] text-white hover:bg-white hover:text-black transition"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Lightbox Modal */}
      {selectedPhotoIndex !== null && (
        <Lightbox
          photo={currentLightboxPhoto}
          onClose={() => setSelectedPhotoIndex(null)}
          hasPrev={selectedPhotoIndex > 0}
          hasNext={selectedPhotoIndex < activePhotos.length - 1}
          onPrev={() => setSelectedPhotoIndex(i => i - 1)}
          onNext={() => setSelectedPhotoIndex(i => i + 1)}
        />
      )}
    </div>
  );
}
