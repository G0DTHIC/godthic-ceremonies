import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import GuestView from './components/GuestView';

export default function App() {
  const [currentEventSlug, setCurrentEventSlug] = useState(null);

  useEffect(() => {
    // Check URL parameters (e.g. ?event=mariage-paul)
    const params = new URLSearchParams(window.location.search);
    const eventParam = params.get('event');
    if (eventParam) {
      setCurrentEventSlug(eventParam);
    }
  }, []);

  const handleSelectEvent = (slug) => {
    setCurrentEventSlug(slug);
    const url = new URL(window.location);
    url.searchParams.set('event', slug);
    window.history.pushState({}, '', url);
  };

  const handleBackToAdmin = () => {
    setCurrentEventSlug(null);
    const url = new URL(window.location);
    url.searchParams.delete('event');
    window.history.pushState({}, '', url);
  };

  if (currentEventSlug) {
    return (
      <GuestView
        eventSlug={currentEventSlug}
        onBackToAdmin={handleBackToAdmin}
      />
    );
  }

  return (
    <AdminDashboard
      onSelectEvent={handleSelectEvent}
    />
  );
}
