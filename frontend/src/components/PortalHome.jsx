import React, { useState, useEffect } from 'react';
import { Camera, Upload, ShieldCheck, Sparkles, ArrowRight, RefreshCw, Calendar, MapPin, AlertCircle, Lock } from 'lucide-react';
import CameraCapture from './CameraCapture';

export default function PortalHome({ onOpenEvent, onOpenAdmin }) {
  const [showCamera, setShowCamera] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [guestScanData, setGuestScanData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);

  // Restore previous scan from session if present
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('godthic_guest_scan');
      if (saved) {
        const parsed = JSON.parse(saved);
        setGuestScanData(parsed);
      }
    } catch (e) {}
  }, []);

  const handleSelfieCaptured = async (dataUrl) => {
    setShowCamera(false);
    await performGlobalSearch(dataUrl);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      await performGlobalSearch(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const performGlobalSearch = async (base64Image) => {
    setAnalyzing(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('selfie_base64', base64Image);
      // Strict threshold (0.44) to prevent false likeness
      formData.append('threshold', '0.44');

      const res = await fetch('/api/search-by-face-global', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.message || "Aucun visage net détecté sur la photo.");
        setGuestScanData(null);
      } else {
        const scanPayload = {
          selfie: base64Image,
          events: data.events || [],
          totalPhotos: data.total_matched_photos || 0
        };
        setGuestScanData(scanPayload);
        try {
          sessionStorage.setItem('godthic_guest_scan', JSON.stringify(scanPayload));
        } catch (e) {}
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erreur lors de la recherche biométrique.");
    } finally {
      setAnalyzing(false);
    }
  };

  const resetScan = () => {
    setGuestScanData(null);
    try {
      sessionStorage.removeItem('godthic_guest_scan');
    } catch (e) {}
  };

  const handleAdminAuth = (e) => {
    e.preventDefault();
    // Default studio access pin
    if (adminPin.trim() === '1234' || adminPin.trim().toLowerCase() === 'godthic' || adminPin.trim() === '') {
      setShowAdminLogin(false);
      onOpenAdmin();
    } else {
      setAdminPinError(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white presence-gradient relative flex flex-col justify-between pb-16">
      {/* Navbar Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-12 py-4 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <img
            src="/logos/logo-godthic-metal.png"
            alt="GODTHIC"
            className="h-8 w-auto object-contain cursor-pointer hover:opacity-85 transition"
            onClick={resetScan}
          />
          <span className="hidden sm:inline-block w-[1px] h-5 bg-white/20"></span>
          <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-widest text-[#ababab]">
            Portail Invité Privé
          </span>
        </div>

        {/* Discreet Studio Access Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdminLogin(true)}
            className="px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-[#ababab] hover:text-white transition font-mono text-[11px] flex items-center gap-1.5"
            title="Espace Photographe / Administration"
          >
            <Lock className="w-3 h-3 text-[#f00000]" />
            <span>ACCÈS STUDIO</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 pt-12 pb-16 w-full flex-1">
        {/* If user is NOT yet scanned or has reset */}
        {!guestScanData ? (
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <p className="kicker mb-3">
              SYSTÈME BIOMÉTRIQUE SANS CONTACT
            </p>

            <h1 className="text-4xl sm:text-7xl font-bold tracking-[-0.075em] leading-[0.85] text-white uppercase mb-6">
              Retrouvez Vos Photos
            </h1>

            <p className="text-sm sm:text-base text-[#d0d0d0] mb-10 max-w-lg leading-relaxed">
              Placez-vous devant l’objectif. Le système scanne vos traits sans contact et déverrouille instantanément les cérémonies et albums où vous apparaissez.
            </p>

            {/* Main Action Box */}
            <div className="w-full godthic-glass rounded-3xl p-8 sm:p-12 border border-white/15 shadow-2xl relative overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setShowCamera(true)}
                  disabled={analyzing}
                  className="godthic-pill-red justify-center py-4 text-xs tracking-wider"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  SCAN FACIAL AUTO
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

              {/* Privacy guarantee */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#ababab] pt-4 border-t border-white/10">
                <ShieldCheck className="w-4 h-4 text-[#f00000]" />
                <span>CONFIDENTIALITÉ TOTALE : Votre selfie est éphémère et sert exclusivement au déverrouillage de vos albums.</span>
              </div>

              {/* Scanning loader */}
              {analyzing && (
                <div className="mt-6 p-4 rounded-2xl bg-black/85 border border-[#f00000]/40 relative overflow-hidden flex items-center justify-center gap-3">
                  <div className="absolute left-0 right-0 h-[2px] bg-[#f00000] shadow-[0_0_12px_#f00000] animate-scan-laser"></div>
                  <div className="w-4 h-4 border-2 border-[#f00000] border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-mono text-xs text-[#f00000] font-bold tracking-wider">
                    ANALYSE EN COURS SUR L'ENSEMBLE DES CÉRÉMONIES...
                  </span>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="mt-6 p-4 rounded-2xl bg-black/80 border border-red-500/50 flex items-center gap-3 text-red-400 text-xs text-left">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* User HAS BEEN SCANNED: show matched events exclusively! */
          <div className="w-full">
            {/* Top Identity Feedback Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 godthic-glass rounded-3xl border border-white/15 mb-10">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#f00000] shadow-[0_0_15px_rgba(240,0,0,0.4)] flex-shrink-0">
                  <img src={guestScanData.selfie} alt="Votre profil" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-[#f00000] text-[9px] font-mono font-bold text-center text-white py-0.5">
                    IDENTIFIÉ
                  </div>
                </div>
                <div>
                  <p className="kicker text-[10px] m-0 mb-1">PROFIL DÉTECTÉ // ACCÈS PRIVÉ</p>
                  <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">
                    Vos Cérémonies & Albums
                  </h2>
                  <p className="text-xs font-mono text-[#ababab]">
                    {guestScanData.totalPhotos} photo(s) identifiée(s) avec certitude biométrique
                  </p>
                </div>
              </div>

              <button
                onClick={resetScan}
                className="godthic-pill text-xs py-2 px-4 whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> REFAIRE UN SCAN
              </button>
            </div>

            {/* List of Matched Events (ONLY the ones where user appears!) */}
            {guestScanData.events.length > 0 ? (
              <div className="space-y-6">
                <p className="kicker">ÉVÉNEMENTS DÉVERROUILLÉS ({guestScanData.events.length})</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {guestScanData.events.map((ev) => (
                    <div 
                      key={ev.slug}
                      className="godthic-glass rounded-3xl p-6 sm:p-8 border border-white/15 hover:border-[#f00000]/60 transition flex flex-col justify-between group"
                    >
                      <div>
                        {/* Event Title & Metadata */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="text-xl sm:text-2xl font-bold tracking-tight uppercase text-white group-hover:text-[#f00000] transition">
                            {ev.title}
                          </h3>
                          <span className="kicker text-[9px] bg-[#f00000]/15 text-[#f00000] border border-[#f00000]/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                            {ev.matched_photos.length} PHOTOS DE VOUS
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#888] mb-6">
                          {ev.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#f00000]" /> {ev.event_date}
                            </span>
                          )}
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#f00000]" /> {ev.location}
                            </span>
                          )}
                        </div>

                        {/* Preview Thumbnails Strip */}
                        <div className="grid grid-cols-4 gap-2 mb-6">
                          {ev.matched_photos.slice(0, 4).map((p) => (
                            <div key={p.id} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/60">
                              <img 
                                src={p.file_path_thumb || p.file_path_web} 
                                alt="" 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action to enter this event */}
                      <button
                        onClick={() => onOpenEvent(ev.slug, ev.matched_photos)}
                        className="godthic-pill-red justify-between py-3.5 px-6 text-xs tracking-wider w-full"
                      >
                        <span>ACCÉDER À CETTE CÉRÉMONIE</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* No events matched */
              <div className="godthic-glass rounded-3xl p-12 text-center max-w-lg mx-auto border border-white/10">
                <AlertCircle className="w-12 h-12 text-[#f00000] mx-auto mb-4" />
                <h3 className="text-xl font-bold uppercase text-white mb-2">Aucune apparition détectée</h3>
                <p className="text-xs text-[#ababab] leading-relaxed mb-6">
                  Le système n'a trouvé aucune photo correspondant à ce profil dans les cérémonies publiées. Assurez-vous d'avoir bien été pris en photo de face, ou essayez avec un autre cliché.
                </p>
                <button
                  onClick={resetScan}
                  className="godthic-pill"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> ESSAYER UN AUTRE SCAN
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleSelfieCaptured}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Admin Passcode Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="godthic-glass rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#f00000]" />
                <span className="kicker text-[11px] m-0">ACCÈS STUDIO PHOTOGRAPHE</span>
              </div>
              <button onClick={() => setShowAdminLogin(false)} className="text-[#888] hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAdminAuth}>
              <p className="text-xs text-[#ababab] mb-4">
                Saisissez votre code PIN ou appuyez directement sur Valider pour accéder au tableau de bord.
              </p>
              <input
                type="password"
                placeholder="Code Studio (optionnel)"
                value={adminPin}
                onChange={(e) => {
                  setAdminPin(e.target.value);
                  setAdminPinError(false);
                }}
                className="godthic-input w-full mb-4 text-center font-mono tracking-widest"
                autoFocus
              />
              {adminPinError && (
                <p className="text-xs text-red-500 mb-3 text-center">Code erroné.</p>
              )}
              <div className="flex gap-2">
                <button type="submit" className="godthic-pill-red w-full justify-center py-2.5">
                  DÉVERROUILLER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
