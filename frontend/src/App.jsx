import React, { useState, useEffect } from 'react';
import PortalHome from './components/PortalHome';
import GuestView from './components/GuestView';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [view, setView] = useState('portal'); // 'portal' | 'guest_event' | 'admin'
  const [currentEventSlug, setCurrentEventSlug] = useState(null);
  const [matchedPhotos, setMatchedPhotos] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventParam = params.get('event');
    const adminParam = params.get('admin');

    if (adminParam === '1' || adminParam === 'true') {
      setView('admin');
    } else if (eventParam) {
      setCurrentEventSlug(eventParam);
      setView('guest_event');
    }
  }, []);

  const handleOpenEventFromPortal = (slug, matchedPhotosList) => {
    setCurrentEventSlug(slug);
    setMatchedPhotos(matchedPhotosList || null);
    setView('guest_event');

    const url = new URL(window.location);
    url.searchParams.set('event', slug);
    window.history.pushState({}, '', url);
  };

  const handleBackToPortal = () => {
    setCurrentEventSlug(null);
    setMatchedPhotos(null);
    setView('portal');

    const url = new URL(window.location);
    url.searchParams.delete('event');
    url.searchParams.delete('admin');
    window.history.pushState({}, '', url);
  };

  const handleOpenAdmin = () => {
    setView('admin');
    const url = new URL(window.location);
    url.searchParams.set('admin', '1');
    window.history.pushState({}, '', url);
  };

  if (view === 'admin') {
    return (
      <div className="relative">
        {/* Top return pill for easy navigation back to portal */}
        <div className="fixed top-4 right-6 z-50">
          <button
            onClick={handleBackToPortal}
            className="godthic-pill text-xs py-1.5 px-3.5 bg-black/80 backdrop-blur-md"
          >
            ← PORTAIL INVITÉ
          </button>
        </div>
        <AdminDashboard
          onSelectEvent={(slug) => handleOpenEventFromPortal(slug, null)}
        />
      </div>
    );
  }

  if (view === 'guest_event' && currentEventSlug) {
    return (
      <GuestView
        eventSlug={currentEventSlug}
        initialMatchedPhotos={matchedPhotos}
        onBack={handleBackToPortal}
      />
    );
  }

  // Default entry view: Biometric Portal Home
  return (
    <PortalHome
      onOpenEvent={handleOpenEventFromPortal}
      onOpenAdmin={handleOpenAdmin}
    />
  );
}
