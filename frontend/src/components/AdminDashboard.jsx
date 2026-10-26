import React, { useState, useEffect } from 'react';
import { Plus, Upload, QrCode, ExternalLink, Calendar, MapPin, Image as ImageIcon, Sparkles, Check, Copy, X, Trash2, Settings, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminDashboard({ onSelectEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeUploadEvent, setActiveUploadEvent] = useState(null);
  const [activeShareEvent, setActiveShareEvent] = useState(null);
  const [activeManageEvent, setActiveManageEvent] = useState(null);

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

  // Manage Event Photos state
  const [managePhotos, setManagePhotos] = useState([]);
  const [loadingManagePhotos, setLoadingManagePhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(false);

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

  // Upload photo par photo pour ne JAMAIS dépasser la mémoire de Render (512 Mo)
  const handleUploadFiles = async () => {
    if (!activeUploadEvent || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      let successCount = 0;
      let totalFaces = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const percent = Math.round(((i) / selectedFiles.length) * 100);

        setUploadProgress({
          current: i + 1,
          total: selectedFiles.length,
          fileName: file.name,
          percent: percent,
          finished: false
        });

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`/api/events/${activeUploadEvent.slug}/upload-single`, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          successCount++;
          totalFaces += (data.photo?.faces_count || 0);
        } else {
          console.error(`Erreur pour ${file.name}`);
        }
      }

      setUploadProgress({
        current: selectedFiles.length,
        total: selectedFiles.length,
        fileName: "Terminé !",
        percent: 100,
        finished: true,
        message: `Succès : ${successCount}/${selectedFiles.length} photo(s) indexée(s), ${totalFaces} visages détectés.`
      });

      setTimeout(() => {
        setActiveUploadEvent(null);
        setSelectedFiles([]);
        setUploadProgress(null);
        setUploading(false);
        fetchEvents();
      }, 1600);
    } catch (err) {
      alert("Erreur de téléversement : " + err.message);
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const removeSelectedFile = (idxToRemove) => {
    if (uploading) return;
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const addFilesToSelection = (e) => {
    const newFiles = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  // Gestion & Suppression des photos d'un événement
  const openManageModal = async (ev) => {
    setActiveManageEvent(ev);
    setLoadingManagePhotos(true);
    try {
      const res = await fetch(`/api/events/${ev.slug}/photos`);
      const data = await res.json();
      setManagePhotos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingManagePhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm("Voulez-vous vraiment supprimer cette photo ?")) return;

    try {
      setDeletingPhotoId(photoId);
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erreur de suppression");

      setManagePhotos(prev => prev.filter(p => p.id !== photoId));
      fetchEvents();
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleDeleteEvent = async (slug) => {
    if (!confirm("ATTENTION : Voulez-vous vraiment supprimer définitivement cette cérémonie et toutes ses photos ?")) return;

    try {
      setDeletingEvent(true);
      const res = await fetch(`/api/events/${slug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erreur de suppression de la cérémonie");

      setActiveManageEvent(null);
      fetchEvents();
    } catch (err) {
      alert("Erreur : " + err.message);
    } finally {
      setDeletingEvent(false);
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
              Vos photographies haute résolution livrées avec précision. L'IA biométrique classe instantanément chaque invité dès son arrivée par selfie.
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
                className="godthic-glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <span className="kicker text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                      [VOL // {ev.photo_count || 0} CLICHÉS]
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openManageModal(ev)}
                        className="p-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-white transition"
                        title="Gérer les photos / Supprimer"
                      >
                        <Settings className="w-4 h-4 text-slate-300" />
                      </button>
                      <button
                        onClick={() => setActiveShareEvent(ev)}
                        className="p-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-white transition"
                        title="Partager & QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
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
                <div className="mt-8 pt-5 border-t border-white/10 flex items-center gap-2">
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

      {/* Modal: Upload Photos (Avec sélection interactive, suppression pré-envoi et upload séquentiel) */}
      {activeUploadEvent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="godthic-glass rounded-3xl p-6 sm:p-8 max-w-xl w-full relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                if (!uploading) setActiveUploadEvent(null);
              }}
              disabled={uploading}
              className="absolute top-6 right-6 p-2 rounded-full border border-white/15 text-[#ababab] hover:text-white disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>

            <p className="kicker mb-1">IMPORTATION SÉQUENTIELLE SÉCURISÉE</p>
            <h3 className="text-2xl font-bold tracking-[-0.04em] uppercase text-white mb-1">
              Téléverser les Clichés
            </h3>
            <p className="text-xs text-[#ababab] mb-4">
              Cérémonie : <strong className="text-white font-semibold">{activeUploadEvent.title}</strong>
            </p>

            {/* Zone d'ajout */}
            <div className="border border-dashed border-white/20 hover:border-[#f00000]/60 rounded-2xl p-6 text-center transition mb-4 godthic-glass-subtle">
              <Upload className="w-8 h-8 text-[#ababab] mx-auto mb-2" />
              <p className="text-xs font-bold text-white uppercase tracking-[-0.02em]">
                Sélectionnez vos photographies HD
              </p>
              <p className="text-[11px] text-[#ababab] mt-1 mb-3">
                Traitement optimisé photo par photo pour une stabilité maximale.
              </p>
              <label className="godthic-pill cursor-pointer text-xs">
                <span>PARCOURIR LES FICHIERS</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={addFilesToSelection}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* Liste interactive des fichiers sélectionnés (avec bouton supprimer individuel) */}
            {selectedFiles.length > 0 && (
              <div className="flex-1 overflow-y-auto mb-4 border border-white/10 rounded-2xl p-3 bg-black/40 max-h-56">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10 text-xs">
                  <span className="font-bold text-white">
                    {selectedFiles.length} photo(s) prête(s) à être envoyée(s)
                  </span>
                  {!uploading && (
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="text-[11px] text-[#f00000] hover:underline"
                    >
                      Tout désélectionner
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/5 border border-white/5 text-xs group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono text-[10px] text-[#ababab]">{idx + 1}.</span>
                        <span className="truncate max-w-[240px] text-slate-200">{file.name}</span>
                        <span className="text-[10px] text-[#777] font-mono whitespace-nowrap">
                          ({(file.size / (1024 * 1024)).toFixed(1)} Mo)
                        </span>
                      </div>
                      {!uploading && (
                        <button
                          onClick={() => removeSelectedFile(idx)}
                          className="p-1 rounded-full hover:bg-red-600/20 text-[#ababab] hover:text-[#f00000] transition"
                          title="Supprimer cette photo de la sélection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progression en direct */}
            {uploadProgress && (
              <div className="mb-4 p-4 rounded-xl bg-[#f00000]/15 border border-[#f00000]/40">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#f00000] font-bold">
                    {uploadProgress.finished ? "TERMINE" : `Photo ${uploadProgress.current} sur ${uploadProgress.total}`}
                  </span>
                  <span className="font-mono text-white font-bold">{uploadProgress.percent}%</span>
                </div>
                {/* Barre de progression */}
                <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                    style={{ width: `${uploadProgress.percent}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-300 font-mono truncate">
                  {uploadProgress.finished ? uploadProgress.message : `Traitement : ${uploadProgress.fileName}`}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveUploadEvent(null)}
                disabled={uploading}
                className="godthic-pill"
              >
                {uploading ? "PATIENTER..." : "FERMER"}
              </button>
              <button
                type="button"
                onClick={handleUploadFiles}
                disabled={uploading || selectedFiles.length === 0}
                className="godthic-pill-red disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {uploading ? "TRAITEMENT EN COURS..." : `LANCER L'INDEXATION (${selectedFiles.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gérer les photos de la cérémonie & Supprimer */}
      {activeManageEvent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="godthic-glass rounded-3xl p-6 sm:p-8 max-w-4xl w-full relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setActiveManageEvent(null)}
              className="absolute top-6 right-6 p-2 rounded-full border border-white/15 text-[#ababab] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start justify-between pr-10 mb-6">
              <div>
                <p className="kicker mb-1">GESTIONNAIRE D'ARCHIVES</p>
                <h3 className="text-2xl font-bold tracking-[-0.04em] uppercase text-white">
                  {activeManageEvent.title}
                </h3>
                <p className="text-xs text-[#ababab] mt-1">
                  Consultez vos photos, supprimez les mauvaises prises ou effacez l'album entier.
                </p>
              </div>

              <button
                onClick={() => handleDeleteEvent(activeManageEvent.slug)}
                disabled={deletingEvent}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/80 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/40 text-xs font-bold transition"
                title="Supprimer définitivement cette cérémonie"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingEvent ? "Suppression..." : "Supprimer la cérémonie"}
              </button>
            </div>

            {/* Grille des photos existantes */}
            <div className="flex-1 overflow-y-auto mb-4 border border-white/10 rounded-2xl p-4 bg-black/40">
              {loadingManagePhotos ? (
                <div className="text-center py-20 text-[#ababab] font-mono text-xs">
                  <div className="w-8 h-8 border-2 border-[#f00000] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  CHARGEMENT DES CLICHÉS...
                </div>
              ) : managePhotos.length === 0 ? (
                <div className="text-center py-16 text-[#ababab]">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune photo dans cette cérémonie pour l'instant.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {managePhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-black border border-white/10 hover:border-red-500/60 transition"
                    >
                      <img
                        src={photo.file_path_thumb || photo.file_path_web}
                        alt={photo.original_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      {/* Bouton de suppression individuelle */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          disabled={deletingPhotoId === photo.id}
                          className="p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition active:scale-95"
                          title="Supprimer cette photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate text-[10px] bg-black/80 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                        {photo.original_filename}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-[#ababab]">
              <span>Total : {managePhotos.length} photo(s) dans l'album</span>
              <button
                onClick={() => setActiveManageEvent(null)}
                className="godthic-pill"
              >
                FERMER
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
