import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle } from 'lucide-react';

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');

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
      setCameraError("Accès caméra impossible. Vérifiez vos autorisations.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
  };

  const retake = () => {
    setCapturedImage(null);
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md godthic-glass rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f00000] animate-pulse"></span>
            <p className="kicker text-[10px] m-0">GODTHIC // VISEUR BIOMÉTRIQUE</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full border border-white/15 text-[#ababab] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative w-full aspect-[4/5] bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-[#ababab]">
              <AlertCircle className="w-10 h-10 text-[#f00000] mx-auto mb-3" />
              <p className="text-xs">{cameraError}</p>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Selfie preview" className="w-full h-full object-cover" />
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-80 rounded-[50%] border border-white/30 flex items-center justify-center shadow-[0_0_30px_rgba(240,0,0,0.2)]">
                  <div className="absolute w-full h-full rounded-[50%] border-t-2 border-b-2 border-[#f00000] animate-spin" style={{ animationDuration: '9s' }}></div>
                  <span className="kicker text-[9px] bg-black/80 px-3 py-1 rounded-full border border-white/20">
                    ALIGNEMENT DU VISAGE
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-black/60 border-t border-white/10 flex items-center justify-around">
          {capturedImage ? (
            <>
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
            </>
          ) : (
            <>
              <button 
                onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                className="p-3 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-white transition"
                title="Inverser caméra"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button 
                onClick={takePhoto}
                className="w-16 h-16 rounded-full border-2 border-[#f00000] p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition"
              >
                <div className="w-full h-full bg-[#f00000] rounded-full hover:bg-white transition"></div>
              </button>
              <div className="w-10"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
