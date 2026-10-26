import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const checkCanvasRef = useRef(null);
  const checkTimerRef = useRef(null);
  const isCheckingRef = useRef(false);

  const [facingMode, setFacingMode] = useState('user');
  const [cameraError, setCameraError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Auto-capture states
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [guideStatus, setGuideStatus] = useState({
    ready: false,
    status: 'INITIALIZING',
    message: 'Alignez votre visage dans le viseur...'
  });
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);

  // Play synthetic camera shutter sound
  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Start webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Accès caméra impossible. Vérifiez vos autorisations de navigation.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (checkTimerRef.current) clearInterval(checkTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  // Execute the photo capture
  const executeCapture = useCallback(() => {
    if (!videoRef.current || isTriggered) return;
    setIsTriggered(true);

    // Audio & Haptic feedback
    playShutterSound();
    if (navigator.vibrate) {
      try { navigator.vibrate([60, 40, 90]); } catch (e) {}
    }

    // Flash screen
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    // Grab full resolution photo
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Stop camera immediately
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setCapturedImage(dataUrl);

    // In auto mode, directly confirm and return photo without friction!
    if (isAutoMode) {
      setTimeout(() => {
        onCapture(dataUrl);
      }, 350);
    }
  }, [facingMode, isAutoMode, isTriggered, onCapture]);

  // Real-time biometric verification loop
  useEffect(() => {
    if (!isAutoMode || capturedImage || isTriggered) {
      if (checkTimerRef.current) clearInterval(checkTimerRef.current);
      return;
    }

    checkTimerRef.current = setInterval(async () => {
      if (isCheckingRef.current || !videoRef.current || isTriggered) return;
      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      isCheckingRef.current = true;

      try {
        if (!checkCanvasRef.current) {
          checkCanvasRef.current = document.createElement('canvas');
        }
        const canvas = checkCanvasRef.current;
        const targetW = 320;
        const targetH = Math.round(targetW * (video.videoHeight / video.videoWidth)) || 240;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (facingMode === 'user') {
          ctx.translate(targetW, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, targetW, targetH);

        // Instant local lighting check
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        const d = imgData.data;
        let sum = 0;
        const step = 24;
        let count = 0;
        for (let i = 0; i < d.length; i += step) {
          sum += (d[i] * 0.299 + d[i+1] * 0.587 + d[i+2] * 0.114);
          count++;
        }
        const avgLuma = sum / count;

        if (avgLuma < 48) {
          setGuideStatus({
            ready: false,
            status: 'TOO_DARK',
            message: "Éclairage trop sombre : cherchez la lumière"
          });
          setStabilityProgress(0);
          isCheckingRef.current = false;
          return;
        }

        if (avgLuma > 238) {
          setGuideStatus({
            ready: false,
            status: 'TOO_BRIGHT',
            message: "Contre-jour trop vif : évitez les reflets"
          });
          setStabilityProgress(0);
          isCheckingRef.current = false;
          return;
        }

        // Call backend biometric analyzer
        const frameDataUrl = canvas.toDataURL('image/jpeg', 0.60);
        const res = await fetch('/api/check-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: frameDataUrl })
        });

        if (res.ok) {
          const data = await res.json();
          setGuideStatus(data);

          if (data.ready) {
            // Face is in perfect position and angle! Increment stability progress
            setStabilityProgress(prev => {
              const next = prev + 34;
              if (next >= 100) {
                // Auto trigger!
                clearInterval(checkTimerRef.current);
                setTimeout(() => {
                  executeCapture();
                }, 50);
                return 100;
              }
              return next;
            });
          } else {
            // Not yet optimal, reset stability meter
            setStabilityProgress(0);
          }
        }
      } catch (err) {
        // Network/frame drop, ignore and continue
      } finally {
        isCheckingRef.current = false;
      }
    }, 280);

    return () => {
      if (checkTimerRef.current) clearInterval(checkTimerRef.current);
    };
  }, [isAutoMode, capturedImage, isTriggered, facingMode, executeCapture]);

  const retake = () => {
    setCapturedImage(null);
    setIsTriggered(false);
    setStabilityProgress(0);
    setGuideStatus({
      ready: false,
      status: 'INITIALIZING',
      message: 'Alignez votre visage dans le viseur...'
    });
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      onCapture(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-3 sm:p-4">
      {/* Full screen shutter flash effect */}
      {isFlashing && (
        <div className="fixed inset-0 z-[60] bg-white animate-out fade-out duration-200 pointer-events-none" />
      )}

      <div className="relative w-full max-w-md godthic-glass rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/20">
        {/* Top Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/10 bg-black/60">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full transition-colors ${
              guideStatus.ready ? 'bg-[#00ff88] shadow-[0_0_8px_#00ff88]' : 'bg-[#f00000] animate-pulse'
            }`}></span>
            <div>
              <p className="kicker text-[10px] m-0 leading-tight">
                {isAutoMode ? 'SCAN FACIAL AUTOMATIQUE' : 'CAPTURE MANUELLE'}
              </p>
              <p className="text-[10px] font-mono text-[#ababab]">
                {guideStatus.ready ? 'ALIGNEMENT OPTIMAL' : 'EN ATTENTE D’ALIGNEMENT'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto/Manual Mode Toggle */}
            <button
              onClick={() => {
                setIsAutoMode(!isAutoMode);
                setStabilityProgress(0);
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border transition ${
                isAutoMode 
                  ? 'border-[#f00000]/60 bg-[#f00000]/20 text-white' 
                  : 'border-white/20 bg-white/5 text-[#888]'
              }`}
            >
              {isAutoMode ? 'Auto : Actif' : 'Manuel'}
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full border border-white/15 text-[#ababab] hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative w-full aspect-[3/4] bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-[#ababab]">
              <AlertCircle className="w-10 h-10 text-[#f00000] mx-auto mb-3" />
              <p className="text-xs">{cameraError}</p>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full">
              <img src={capturedImage} alt="Selfie preview" className="w-full h-full object-cover" />
              {isAutoMode && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-2 border-[#f00000] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="kicker text-xs text-white">RECHERCHE BIOMÉTRIQUE EN COURS...</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Biometric HUD Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Oval Guide Reticle with dynamic stability ring */}
                <div className="relative w-64 h-80 flex items-center justify-center">
                  {/* SVG progress border filling up when stable */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 256 320">
                    {/* Background faint guide */}
                    <ellipse
                      cx="128"
                      cy="160"
                      rx="110"
                      ry="142"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="1.5"
                      strokeDasharray="6 6"
                    />
                    {/* Active filling progress arc */}
                    <ellipse
                      cx="128"
                      cy="160"
                      rx="110"
                      ry="142"
                      fill="none"
                      stroke={guideStatus.ready ? '#00ff88' : '#f00000'}
                      strokeWidth={guideStatus.ready ? '4' : '2'}
                      strokeDasharray="800"
                      strokeDashoffset={800 - (800 * stabilityProgress) / 100}
                      className="transition-all duration-300 ease-out"
                      style={{
                        filter: guideStatus.ready ? 'drop-shadow(0 0 10px rgba(0,255,136,0.8))' : 'drop-shadow(0 0 6px rgba(240,0,0,0.5))'
                      }}
                    />
                  </svg>

                  {/* Corner Reticle Brackets */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/40"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/40"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/40"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/40"></div>

                  {/* Center Scanning laser effect when searching */}
                  {!guideStatus.ready && (
                    <div className="absolute w-48 h-[1px] bg-gradient-to-r from-transparent via-[#f00000] to-transparent animate-scan-laser shadow-[0_0_8px_#f00000]"></div>
                  )}

                  {/* Center lock indicator when optimal */}
                  {guideStatus.ready && (
                    <div className="flex flex-col items-center justify-center animate-pulse">
                      <div className="w-14 h-14 rounded-full border-2 border-[#00ff88] flex items-center justify-center bg-black/40 backdrop-blur-md shadow-[0_0_20px_rgba(0,255,136,0.6)]">
                        <Check className="w-7 h-7 text-[#00ff88]" />
                      </div>
                      <span className="mt-2 text-[10px] font-mono font-bold text-[#00ff88] tracking-widest bg-black/80 px-2 py-0.5 rounded border border-[#00ff88]/40">
                        VERROUILLÉ {stabilityProgress}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Live Biometric Guidance Message Pill */}
                <div className="absolute bottom-6 px-4">
                  <div className={`px-4 py-2 rounded-full border backdrop-blur-xl flex items-center gap-2 transition-all shadow-xl ${
                    guideStatus.ready 
                      ? 'border-[#00ff88]/80 bg-[#00ff88]/20 text-[#00ff88]'
                      : 'border-white/20 bg-black/85 text-white'
                  }`}>
                    {guideStatus.ready ? (
                      <Zap className="w-3.5 h-3.5 animate-bounce" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-[#f00000]" />
                    )}
                    <span className="text-[11px] font-bold tracking-wide uppercase">
                      {guideStatus.message || "Positionnez votre visage"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-4 sm:p-5 bg-black/80 border-t border-white/10 flex items-center justify-between">
          {capturedImage ? (
            <div className="w-full flex items-center justify-around gap-4">
              <button 
                onClick={retake}
                className="godthic-pill"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> REPRENDRE
              </button>
              <button 
                onClick={confirmPhoto}
                className="godthic-pill-red"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" /> RECHERCHER
              </button>
            </div>
          ) : (
            <>
              {/* Switch camera button */}
              <button 
                onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                className="p-3 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-white transition flex items-center gap-2 text-xs"
                title="Inverser caméra"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline font-mono text-[10px]">INVERSER</span>
              </button>

              {/* Center status or manual trigger button */}
              {isAutoMode ? (
                <div className="text-center px-2">
                  <p className="text-[11px] text-[#ababab] font-medium leading-tight">
                    Aucun clic requis. Gardez la pose dans l'ovale.
                  </p>
                  <button
                    onClick={executeCapture}
                    className="text-[10px] text-[#f00000] underline hover:text-white mt-1 uppercase font-mono tracking-wider"
                  >
                    Déclencher maintenant
                  </button>
                </div>
              ) : (
                <button 
                  onClick={executeCapture}
                  className="w-14 h-14 rounded-full border-2 border-[#f00000] p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-[0_0_15px_rgba(240,0,0,0.4)]"
                  title="Prendre la photo manuellement"
                >
                  <div className="w-full h-full bg-[#f00000] rounded-full hover:bg-white transition"></div>
                </button>
              )}

              {/* Security reassurance */}
              <div className="flex items-center gap-1.5 text-[#ababab] font-mono text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#f00000]" />
                <span className="hidden sm:inline">DONNÉE VOLATILE</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
