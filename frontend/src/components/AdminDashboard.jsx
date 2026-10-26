import React, { useState, useEffect } from 'react';
import { Plus, Upload, QrCode, ExternalLink, Calendar, MapPin, Image as ImageIcon, Sparkles, Check, Copy, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminDashboard({ onSelectEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeUploadEvent, setActiveUploadEvent] = useState(null);
  const [activeShareEvent, setActiveShareEvent] = useState(null);

  // Create form state
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [passcode, setPasscode] = useState('');
  const [creating, setCreating] = useState(false);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Copy feedback
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          event_date: eventDate,
          location,
          passcode
        })
      });

      if (!res.ok) throw new Error("Erreur de création");

      const newEvent = await res.json();
      setShowCreateModal(false);
      setTitle('');
      setEventDate('');
      setLocation('');
      setPasscode('');
      await fetchEvents();
      setActiveUploadEvent(newEvent);
    } catch (err) {
      alert("Erreur: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUploadFiles = async () => {
    if (!activeUploadEvent || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress("Traitement haute définition et indexation faciale en cours...");

      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }

      const res = await fetch(`/api/events/${activeUploadEvent.slug}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error("Erreur lors de l'envoi des photos");

      const data = await res.json();
      setUploadProgress(`INDEXATION ACHEVÉE : ${data.uploaded_count} photos, ${data.total_faces_detected} visages indexés.`);
      setTimeout(() => {
        setActiveUploadEvent(null);
        setSelectedFiles([]);
        setUploadProgress(null);
        setUploading(false);
        fetchEvents();
      }, 1500);
    } catch (err) {
      alert("Erreur de téléversement : " + err.message);
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const copyShareLink = (slug) => {
    const url = `${window.location.origin}?event=${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 presence-gradient relative">
      {/* Navbar — Directement inspirée de ggodthicc.com */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 sm:px-12 py-4 border-b border-white/15 bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <a href="#" className="flex items-center">
            <img
              src="/logos/logo-godthic-metal.png"
              alt="GODTHIC"
              className="h-9 w-auto object-contain hover:opacity-85 transition"
            />
          </a>
          <span className="hidden sm:inline-block w-[1px] h-5 bg-white/20"></span>
          <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-widest text-[#ababab]">
            Photo Cérémonie
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="godthic-pill-red"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> NOUVELLE CÉRÉMONIE
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 sm:px-12 pt-12">
        {/* Presence / Hero Header */}
        <div className="mb-14 godthic-glass rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="relative z-10">
            <p className="kicker mb-3">DIS-LE, DONNE-LUI DU SENS, FAIS-LE EXISTER.</p>
            <h1 className="text-4xl sm:text-7xl font-bold tracking-[-0.075em] leading-[0.88] uppercase text-white mb-6">
              ARCHIVES &<br />CÉRÉMONIES.
            </h1>
            <p className="text-xs sm:text-sm text-[#d0d0d0] max-w-xl font-normal leading-relaxed">
              Vos photographies haute résolution livrées avec précision. L'IA biométrique en local classe instantanément chaque invité dès son arrivée par selfie.
            </p>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center gap-8">
            <div>
              <span className="font-mono text-3xl font-bold text-[#f00000]">{events.length}</span>
              <p className="kicker text-[10px] text-[#ababab] mt-1">CÉRÉMONIES</p>
            </div>
            <div className="w-[1px] h-9 bg-white/15"></div>
            <div>
              <span className="font-mono text-3xl font-bold text-white">
                {events.reduce((acc, curr) => acc + (curr.photo_count || 0), 0)}
              </span>
              <p className="kicker text-[10px] text-[#ababab] mt-1">PHOTOS HD LIVRÉES</p>
            </div>
          </div>
        </div>

        {/* Section Head */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="kicker">INDEX DES PROJETS</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-[-0.05em] uppercase text-white mt-1">
              Événements Actifs
            </h2>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-20 text-[#ababab] font-mono text-xs">
            <div className="w-8 h-8 border-2 border-[#f00000] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            CHARGEMENT DES ARCHIVES EN COURS...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 godthic-glass rounded-3xl p-10">
            <ImageIcon className="w-12 h-12 text-[#555] mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white uppercase tracking-[-0.03em]">
              Aucune cérémonie enregistrée
            </h3>
            <p className="text-xs text-[#ababab] mt-2 mb-6 max-w-md mx-auto">
              Créez votre premier album pour téléverser vos clichés et activer la reconnaissance faciale automatique.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="godthic-pill-red"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> CRÉER UNE CÉRÉMONIE
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="godthic-glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <span className="kicker text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                      [VOL // {ev.photo_count || 0} CLICHÉS]
                    </span>
                    <button
                      onClick={() => setActiveShareEvent(ev)}
                      className="p-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-white transition"
                      title="Partager & QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-2xl font-bold tracking-[-0.05em] uppercase text-white group-hover:text-[#f00000] transition">
                    {ev.title}
                  </h3>

                  <div className="mt-4 space-y-1.5 text-xs text-[#ababab]">
                    {ev.event_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#f00000]" />
                        <span>{ev.event_date}</span>
                      </div>
                    )}
                    {ev.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#f00000]" />
                        <span>{ev.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 pt-5 border-t border-white/10 flex items-center gap-3">
                  <button
                    onClick={() => setActiveUploadEvent(ev)}
                    className="godthic-pill flex-1"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-[#f00000]" />
                    UPLOADER
                  </button>

                  <button
                    onClick={() => onSelectEvent(ev.slug)}
                    className="godthic-pill border-[#f00000]/40 text-white hover:border-[#f00000]"
                    title="Voir l'expérience invité"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    INVITÉ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal: Create Event */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="godthic-glass rounded-3xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full border border-white/15 text-[#ababab] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="kicker mb-1">NOUVEL ALBUM</p>
            <h3 className="text-2xl font-bold tracking-[-0.04em] uppercase text-white mb-2">
              Créer une Cérémonie
            </h3>
            <p className="text-xs text-[#ababab] mb-6">
              Renseignez les coordonnées de l'événement pour initialiser l'espace.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="kicker block text-[10px] text-white/80 mb-1.5">
                  NOM DE LA CÉRÉMONIE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mariage de Sarah & Thomas"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl godthic-input text-sm text-white placeholder-[#555]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="kicker block text-[10px] text-white/80 mb-1.5">
                    DATE
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl godthic-input text-sm text-white"
                  />
                </div>
                <div>
                  <label className="kicker block text-[10px] text-white/80 mb-1.5">
                    LIEU
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Abidjan, Sofitel"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl godthic-input text-sm text-white placeholder-[#555]"
                  />
                </div>
              </div>

              <div>
                <label className="kicker block text-[10px] text-white/80 mb-1.5">
                  CODE PIN D'ACCÈS (OPTIONNEL)
                </label>
                <input
                  type="text"
                  placeholder="Laisser vide si accès libre"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl godthic-input text-sm text-white placeholder-[#555]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="godthic-pill"
                >
                  ANNULER
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="godthic-pill-red"
                >
                  {creating ? "CRÉATION..." : "INITIALISER L'ALBUM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Photos */}
      {activeUploadEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="godthic-glass rounded-3xl p-8 max-w-lg w-full relative">
            <button
              onClick={() => {
                if (!uploading) setActiveUploadEvent(null);
              }}
              disabled={uploading}
              className="absolute top-6 right-6 p-2 rounded-full border border-white/15 text-[#ababab] hover:text-white disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="kicker mb-1">IMPORTATION BATCH</p>
            <h3 className="text-2xl font-bold tracking-[-0.04em] uppercase text-white mb-2">
              Téléverser les Clichés
            </h3>
            <p className="text-xs text-[#ababab] mb-6">
              Événement : <strong className="text-white font-semibold">{activeUploadEvent.title}</strong>
            </p>

            {/* Frosted Dropzone */}
            <div className="border border-dashed border-white/20 hover:border-[#f00000]/60 rounded-2xl p-8 text-center transition mb-4 godthic-glass-subtle">
              <Upload className="w-10 h-10 text-[#ababab] mx-auto mb-3" />
              <p className="text-sm font-bold text-white uppercase tracking-[-0.02em]">
                Glissez-déposez vos photographies
              </p>
              <p className="text-xs text-[#ababab] mt-1 mb-4">
                JPG, PNG — Résolution originale HD préservée
              </p>
              <label className="godthic-pill cursor-pointer">
                <span>PARCOURIR LES DOSSIERS</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="p-3.5 godthic-glass-subtle rounded-xl border border-white/10 text-xs text-white flex items-center justify-between mb-4">
                <span>📁 {selectedFiles.length} fichier(s) sélectionné(s)</span>
                <span className="text-[#ababab]">
                  (~{Math.round(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024))} Mo)
                </span>
              </div>
            )}

            {uploadProgress && (
              <div className="mb-4 p-3.5 rounded-xl bg-[#f00000]/15 border border-[#f00000]/40 text-xs text-[#f00000] font-bold flex items-center gap-3">
                <div className="w-3.5 h-3.5 border-2 border-[#f00000] border-t-transparent rounded-full animate-spin"></div>
                <span>{uploadProgress}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveUploadEvent(null)}
                disabled={uploading}
                className="godthic-pill"
              >
                ANNULER
              </button>
              <button
                type="button"
                onClick={handleUploadFiles}
                disabled={uploading || selectedFiles.length === 0}
                className="godthic-pill-red disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {uploading ? "INDEXATION..." : "LANCER L'INDEXATION"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Share & QR Code */}
      {activeShareEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="godthic-glass rounded-3xl p-8 max-w-sm w-full relative text-center">
            <button
              onClick={() => setActiveShareEvent(null)}
              className="absolute top-6 right-6 p-2 rounded-full border border-white/15 text-[#ababab] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="kicker mb-1">PARTAGE</p>
            <h3 className="text-2xl font-bold tracking-[-0.04em] uppercase text-white mb-2">
              QR Code & Lien
            </h3>
            <p className="text-xs text-[#ababab] mb-6">
              Imprimez le QR code pour les tables ou copiez le lien direct.
            </p>

            <div className="bg-white p-5 rounded-2xl inline-block shadow-2xl mb-6">
              <QRCodeSVG
                value={`${window.location.origin}?event=${activeShareEvent.slug}`}
                size={200}
                level="M"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => copyShareLink(activeShareEvent.slug)}
                className="godthic-pill w-full justify-center py-3"
              >
                {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? "LIEN COPIÉ !" : "COPIER LE LIEN DIRECT"}
              </button>

              <button
                onClick={() => onSelectEvent(activeShareEvent.slug)}
                className="godthic-pill-red w-full justify-center py-3"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                OUVRIR LA VUE INVITÉ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
