import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RefreshCw, Check, AlertCircle, Info, Sparkles, ChevronRight, Eye, X, ArrowRight, ShoppingBag, Globe, DollarSign, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initFaceLandmarker, classifyFaceShape } from './services/faceService';
import { RECOMENDACIONES, FaceShape, TIENDAS, Store } from './constants';
import { generateVirtualTryOn, getFrameRecommendations } from './services/geminiService';
import { cn } from './lib/utils';

type View = 'upload' | 'result' | 'recommendations' | 'stores';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState<View>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ shape: FaceShape; ratios: any } | null>(null);
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [tryingOn, setTryingOn] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    initFaceLandmarker()
      .then(() => setLoadingModel(false))
      .catch(err => {
        console.error("Failed to init face landmarker", err);
        setError("No se pudo cargar el modelo de detección facial.");
        setLoadingModel(false);
      });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setResult(null);
        setTryOnImage(null);
        setSelectedStyle(null);
        setView('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      streamRef.current = stream;
    } catch (err) {
      setCameraActive(false);
      console.error("Error accessing camera", err);
      setError("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  useEffect(() => {
    if (cameraActive && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error("Error playing video", e));
    }
  }, [cameraActive, cameraStream]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (video && video.videoWidth > 0 && video.readyState >= 2) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setImage(dataUrl);
        stopCamera();
        setResult(null);
        setTryOnImage(null);
        setSelectedStyle(null);
        setView('upload');
      }
    } else if (video) {
      // Fallback for mobile if dimensions or data are not yet ready
      console.warn("Video not ready for capture, retrying...", {
        width: video.videoWidth,
        readyState: video.readyState
      });
      setTimeout(capturePhoto, 150);
    }
  };

  const analyzeFace = async () => {
    if (!image) return;
    setAnalyzing(true);
    setError(null);

    try {
      console.log("Loading image for analysis...");
      const landmarker = await initFaceLandmarker();
      const img = new Image();
      img.src = image;
      await img.decode();
      
      // Use a temporary canvas to ensure the image is correctly formatted
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error("Could not get canvas context");
      tempCtx.drawImage(img, 0, 0);

      console.log("Starting detection...");
      const detection = landmarker.detect(tempCanvas);
      console.log("Detection result:", detection);
      
      if (!detection || detection.faceLandmarks.length === 0) {
        setError("No se detectó ningún rostro. Intenta con una foto frontal clara.");
        setAnalyzing(false);
        return;
      }

      const landmarks = detection.faceLandmarks[0];
      const classification = classifyFaceShape(landmarks, img.width, img.height);
      setResult(classification);
      setView('result');

      // Draw measurements on canvas for visualization
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Define points for measurements
          const p = {
            frente: landmarks[10],
            barbilla: landmarks[152],
            lado_izq: landmarks[234],
            lado_der: landmarks[454],
            pomulo_izq: landmarks[93],
            pomulo_der: landmarks[323],
            mandibula_izq: landmarks[172],
            mandibula_der: landmarks[397],
            frente_izq: landmarks[54],
            frente_der: landmarks[284],
            ojo_izq: landmarks[33],
            ojo_der: landmarks[263],
          };

          const drawMeasurement = (p1: any, p2: any, label: string) => {
            const x1 = p1.x * canvas.width;
            const y1 = p1.y * canvas.height;
            const x2 = p2.x * canvas.width;
            const y2 = p2.y * canvas.height;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw small circles at ends
            ctx.beginPath();
            ctx.arc(x1, y1, 4, 0, Math.PI * 2);
            ctx.arc(x2, y2, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff00';
            ctx.fill();

            // Label
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)).toFixed(0);
            
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(`${label}: ${dist}px`, midX + 10, midY);
            ctx.shadowBlur = 0;
          };

          drawMeasurement(p.frente, p.barbilla, "Largo");
          drawMeasurement(p.lado_izq, p.lado_der, "Ancho");
          drawMeasurement(p.frente_izq, p.frente_der, "Frente");
          drawMeasurement(p.mandibula_izq, p.mandibula_der, "Mandíbula");
          drawMeasurement(p.ojo_izq, p.ojo_der, "Interocular");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Error al procesar la imagen.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTryOn = async (style: string) => {
    if (!image || !result) return;
    setSelectedStyle(style);
    setTryingOn(true);
    setError(null);

    try {
      const generated = await generateVirtualTryOn(image, result.shape, style);
      setTryOnImage(generated);
    } catch (err) {
      console.error(err);
      setError("Error al generar la simulación. Asegúrate de tener configurada tu API Key.");
    } finally {
      setTryingOn(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!result) return;
    setLoadingRecommendations(true);
    setView('recommendations');
    try {
      const recs = await getFrameRecommendations(result.shape);
      setRecommendations(recs);
    } catch (err) {
      console.error(err);
      setError("Error al obtener recomendaciones.");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setTryOnImage(null);
    setSelectedStyle(null);
    setError(null);
    setView('upload');
    setRecommendations([]);
    setSelectedStore(null);
    stopCamera();
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              <div className="bg-indigo-600 p-6 rounded-3xl shadow-2xl shadow-indigo-200">
                <Eye className="text-white w-16 h-16" />
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2">VisionMatch</h1>
                <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Análisis Facial de Precisión</p>
              </div>
            </motion.div>
            
            <div className="absolute bottom-12">
              <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 2.5, ease: "linear" }}
                  className="w-full h-full bg-indigo-600"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Eye className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">VisionMatch</h1>
          </div>
          {image && (
            <button 
              onClick={reset}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Reiniciar
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loadingModel ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
            <p className="text-slate-500 font-medium">Cargando modelos de IA...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Upload & Image */}
          <div className="lg:col-span-7 space-y-6">
            {!image ? (
              <div className="space-y-4">
                {cameraActive ? (
                  <div className="relative bg-black rounded-3xl overflow-hidden shadow-xl aspect-video flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <button 
                        onClick={capturePhoto}
                        className="bg-white text-indigo-600 p-4 rounded-full shadow-xl hover:scale-105 transition-transform"
                      >
                        <Camera className="w-8 h-8" />
                      </button>
                      <button 
                        onClick={stopCamera}
                        className="bg-red-500 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-transform"
                      >
                        <X className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-400 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="bg-indigo-50 p-4 rounded-full">
                        <Upload className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Galería</h3>
                        <p className="text-slate-500 text-sm">Sube una foto existente</p>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                      />
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-400 transition-colors cursor-pointer"
                      onClick={startCamera}
                    >
                      <div className="bg-indigo-50 p-4 rounded-full">
                        <Camera className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Cámara</h3>
                        <p className="text-slate-500 text-sm">Toma una foto ahora</p>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200"
              >
                <img 
                  src={tryOnImage || image} 
                  alt="Uploaded" 
                  className="w-full h-auto object-cover"
                />
                <canvas 
                  ref={canvasRef} 
                  className={cn(
                    "absolute inset-0 w-full h-full pointer-events-none",
                    view === 'result' ? "opacity-100" : "opacity-0"
                  )} 
                />
                
                {analyzing && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                    <p className="font-semibold text-indigo-900">Analizando proporciones faciales...</p>
                  </div>
                )}

                {tryingOn && (
                  <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-md flex flex-col items-center justify-center text-white">
                    <Sparkles className="w-12 h-12 animate-pulse mb-4" />
                    <p className="font-bold text-xl">Probador Virtual</p>
                    <p className="text-indigo-100">Ajustando monturas a tu rostro...</p>
                  </div>
                )}
              </motion.div>
            )}

            {image && !result && !analyzing && (
              <button 
                onClick={analyzeFace}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Camera className="w-6 h-6" />
                Analizar Rostro
              </button>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Results & Recommendations */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              {view === 'result' && result ? (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Face Shape Card */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-4xl">{RECOMENDACIONES[result.shape].emoji}</div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Rostro Detectado</p>
                        <h2 className="text-2xl font-bold text-slate-800 capitalize">{result.shape}</h2>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      {RECOMENDACIONES[result.shape].descripcion}
                    </p>
                  </div>

                  {/* Detailed Ratios */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest mb-4">Medidas Detalladas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Ratio Alto/Ancho</p>
                        <p className="text-lg font-mono font-bold text-indigo-600">{result.ratios.ratio_alto_ancho.toFixed(3)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Ratio Mandíbula/Pómulos</p>
                        <p className="text-lg font-mono font-bold text-indigo-600">{result.ratios.ratio_mandibula_pomulos.toFixed(3)}</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={fetchRecommendations}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    Ver Recomendaciones
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              ) : view === 'recommendations' && result ? (
                <motion.div 
                  key="recommendations"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Sparkles className="text-indigo-600 w-5 h-5" />
                      Recomendaciones de Marcos
                    </h3>
                    
                    {loadingRecommendations ? (
                      <div className="flex flex-col items-center py-12 space-y-4">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                        <p className="text-slate-500 text-sm">Consultando a Gemini...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recommendations.map((rec, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleTryOn(rec.shape)}
                            disabled={tryingOn}
                            className={cn(
                              "w-full p-4 rounded-2xl border text-left transition-all group",
                              selectedStyle === rec.shape 
                                ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200" 
                                : "bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50"
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-800">{rec.shape}</h4>
                              <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                {rec.style}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">Material: <span className="text-slate-700 font-medium">{rec.material}</span></p>
                            <p className="text-xs text-slate-600 italic leading-relaxed">
                              "{rec.explanation}"
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setView('result')}
                    className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    Volver a Medidas
                  </button>

                  {selectedStyle && (
                    <button 
                      onClick={() => setView('stores')}
                      className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      Dónde Comprar {selectedStyle}
                    </button>
                  )}
                </motion.div>
              ) : view === 'stores' && result ? (
                <motion.div 
                  key="stores"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <ShoppingBag className="text-green-600 w-5 h-5" />
                      Tiendas y Marcas
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                      Encuentra tu marco <span className="font-bold text-slate-800">{selectedStyle}</span> en estas tiendas recomendadas.
                    </p>

                    <div className="space-y-8">
                      {(['económico', 'medio', 'premium'] as const).map((budget) => (
                        <div key={budget} className="space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            Rango {budget}
                          </h4>
                          <div className="grid grid-cols-1 gap-4">
                            {TIENDAS.filter(s => s.presupuesto === budget).map((store) => (
                              <a
                                key={store.id}
                                href={store.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setSelectedStore(store.id)}
                                className={cn(
                                  "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                                  selectedStore === store.id 
                                    ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200" 
                                    : "bg-white border-slate-100 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50"
                                )}
                              >
                                {/* Designed Brand Placeholder */}
                                <div className={cn(
                                  "w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-xl shadow-inner bg-gradient-to-br transition-transform group-hover:scale-110",
                                  store.color
                                )}>
                                  {store.nombre.charAt(0)}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <h5 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                      {store.nombre}
                                    </h5>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter",
                                        store.tipo === 'nacional' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                      )}>
                                        {store.tipo}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                                    {store.descripcion}
                                  </p>
                                  <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span>Visitar sitio oficial</span>
                                    <ArrowRight className="w-2 h-2" />
                                  </div>
                                </div>

                                {selectedStore === store.id && (
                                  <div className="absolute top-2 right-2">
                                    <div className="bg-indigo-600 rounded-full p-0.5">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setView('recommendations')}
                    className="w-full bg-slate-100 text-slate-600 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    Volver a Recomendaciones
                  </button>
                </motion.div>
              ) : !analyzing && (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-indigo-50 rounded-3xl p-8 text-center space-y-4 border border-indigo-100"
                >
                  <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles className="text-indigo-600 w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-indigo-900 text-lg">Descubre tu estilo</h3>
                  <p className="text-indigo-700/70 text-sm">
                    Analizaremos tu estructura ósea para recomendarte las gafas que mejor se adaptan a ti.
                  </p>
                  <div className="space-y-2 pt-4">
                    <div className="flex items-center gap-3 text-left text-xs text-indigo-800/60 bg-white/50 p-3 rounded-xl">
                      <div className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">1</div>
                      Sube una foto clara de frente
                    </div>
                    <div className="flex items-center gap-3 text-left text-xs text-indigo-800/60 bg-white/50 p-3 rounded-xl">
                      <div className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">2</div>
                      Detectaremos tu tipo de rostro
                    </div>
                    <div className="flex items-center gap-3 text-left text-xs text-indigo-800/60 bg-white/50 p-3 rounded-xl">
                      <div className="bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">3</div>
                      ¡Pruébate gafas virtualmente!
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </main>
      
      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-200 mt-12 text-center">
        <p className="text-slate-400 text-sm">
          VisionMatch AI &bull; Análisis Facial de Precisión
        </p>
      </footer>
    </div>
  </>
);
}
