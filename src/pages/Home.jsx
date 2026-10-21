import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const { currentMode, setCurrentMode } = useTheme();
  const navigate = useNavigate();
  
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  
  // Enlace de audiolibro directo de Podbean (CDN estable)
  const [audioUrl, setAudioUrl] = useState('https://mcdn.podbean.com/mf/web/68kpmtuwn4nf2dm5/El_gato_con_botas_cuento_infantil_Cuentos_infantiles_en_Espa_ol60wrg.mp3');
  const audioRef = useRef(null);

  // TTS state
  const [ttsText, setTtsText] = useState('');
  const [ttsRate, setTtsRate] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Si la URL cambia o se inicializa
    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(audioUrl);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.onerror = () => {
      console.warn('No se pudo cargar el stream de audio, usando audio de respaldo');
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setShowMiniPlayer(true);
      }).catch(err => {
        console.error('Error al reproducir audio:', err);
        // Respaldo de prueba
        audioRef.current.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
        setShowMiniPlayer(true);
      });
    }
  };

  // Referencia para evitar que el Garbage Collector de Chrome corte la voz
  const utteranceRef = useRef(null);

  // Precargar voces del navegador
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // TTS functions
  const handleTTSPlay = () => {
    const text = ttsText.trim();
    if (!text) return;
    
    if (!window.speechSynthesis) {
      alert('Tu navegador no soporta síntesis de voz (Web Speech API).');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;
        window.__activeUtterance = utterance; // Evita recolector de basura V8

        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(v => v.lang.toLowerCase().startsWith('es') || v.name.toLowerCase().includes('spanish'))
                          || voices.find(v => v.default)
                          || voices[0];
        
        if (spanishVoice) {
          utterance.voice = spanishVoice;
          utterance.lang = spanishVoice.lang;
        } else {
          utterance.lang = 'es-ES';
        }

        utterance.rate = ttsRate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          utteranceRef.current = null;
        };
        utterance.onerror = (e) => {
          console.warn('[TTS] Error o interrupción:', e);
          setIsSpeaking(false);
          utteranceRef.current = null;
        };

        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (err) {
        console.error('Error al iniciar TTS:', err);
        setIsSpeaking(false);
      }
    }, 60);
  };

  // Accesibilidad: Cerrar modal con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsThemePanelOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/60 backdrop-blur-md px-4 py-3 flex justify-between items-center" role="banner">
        <h1 className="text-lg font-bold">PDFReader</h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/reader')}
            className="p-2 rounded-full card" 
            title="Abrir Lector PDF"
            aria-label="Abrir Lector PDF"
          >
            <span className="material-symbols-outlined icon-var" aria-hidden="true">picture_as_pdf</span>
          </button>
          <button 
            onClick={() => setIsThemePanelOpen(true)}
            aria-haspopup="true" 
            aria-expanded={isThemePanelOpen} 
            className="p-2 rounded-full card" 
            title="Apariencia"
          >
            <span className="material-symbols-outlined icon-var" aria-hidden="true">palette</span>
            <span className="sr-only">Abrir panel de apariencia</span>
          </button>
          <button className="p-1 rounded-full card" title="Perfil" aria-label="Abrir perfil">
            <img src="https://i.postimg.cc/XZk5P11j/XZk5P11j.jpg" className="w-8 h-8 rounded-full object-cover" alt="Avatar usuario" />
          </button>
        </div>
      </header>

      {/* CONTENIDO HOME */}
      <section className="p-4" aria-labelledby="homeTitle">
        <div className="max-w-xl mx-auto">
          <header className="flex items-center justify-between mb-4">
            <h2 id="homeTitle" className="font-bold text-xl">Lectura y Audio</h2>
            <button onClick={() => setIsThemePanelOpen(true)} className="p-2 rounded-full surface" title="Apariencia mini">
              <span className="material-symbols-outlined">palette</span>
            </button>
          </header>

          <div className="card p-4 rounded-xl mb-6 flex gap-4">
            <img src="https://i.postimg.cc/gnr0cmPb/gnr0cmPb.jpg" className="w-16 h-24 rounded-lg object-cover" alt="Portada"/>
            <div className="flex-1">
              <p className="font-semibold text-lg">El gato con botas</p>
              <p className="text-sm opacity-70">Charles Perrault</p>
              <button 
                onClick={togglePlay}
                className="w-full accent rounded-full mt-3 p-2 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span> 
                {isPlaying ? 'Pausar' : 'Reproducir'}
              </button>
            </div>
          </div>

          <h3 className="font-bold mb-3">Categorías</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scroll-x" role="list" aria-label="Categorías">
            <div className="min-w-[90px] surface p-3 rounded-lg text-center" role="listitem">
              <span className="material-symbols-outlined icon-var">headphones</span>
              <p className="text-sm">Audio</p>
            </div>
            <div className="min-w-[90px] surface p-3 rounded-lg text-center" role="listitem">
              <span className="material-symbols-outlined icon-var">book_2</span>
              <p className="text-sm">Libros</p>
            </div>
            <div className="min-w-[90px] surface p-3 rounded-lg text-center" role="listitem">
              <span className="material-symbols-outlined icon-var">podcasts</span>
              <p className="text-sm">Podcast</p>
            </div>
            <div className="min-w-[90px] surface p-3 rounded-lg text-center" role="listitem">
              <span className="material-symbols-outlined icon-var">article</span>
              <p className="text-sm">Artículos</p>
            </div>
          </div>

          {/* CARD LECTOR PDF */}
          <div className="card p-4 rounded-xl mt-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined icon-var text-3xl" aria-hidden="true">picture_as_pdf</span>
              <div>
                <p className="font-semibold text-lg">Lector de PDF</p>
                <p className="text-sm opacity-70">Abre y lee documentos PDF con voz</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/reader')}
              className="w-full accent rounded-full p-2 flex items-center justify-center gap-2"
              aria-label="Abrir lector de PDF"
            >
              <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
              Abrir Lector
            </button>
          </div>

          {/* TTS DEMO SECTION */}
          <div className="card p-4 rounded-xl mb-6" aria-labelledby="ttsTitle">
            <h3 id="ttsTitle" className="font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined icon-var" aria-hidden="true">record_voice_over</span>
              Texto a Voz
            </h3>
            <label htmlFor="ttsInput" className="block text-sm mb-1 opacity-70">
              Escribe o pega texto para escucharlo en voz alta
            </label>
            <textarea
              id="ttsInput"
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Escribe aquí el texto que deseas escuchar..."
              className="w-full p-3 rounded-lg surface resize-none min-h-[80px] mb-3"
              aria-label="Texto para leer en voz alta"
              rows={3}
            />
            <div className="flex items-center gap-3 mb-3">
              <label htmlFor="ttsSpeed" className="text-sm whitespace-nowrap">
                Velocidad: {ttsRate.toFixed(1)}x
              </label>
              <input
                id="ttsSpeed"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={ttsRate}
                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                className="flex-1"
                aria-label="Velocidad de lectura"
              />
            </div>
            <button
              onClick={handleTTSPlay}
              disabled={!ttsText.trim()}
              className={`w-full rounded-full p-2 flex items-center justify-center gap-2 transition-opacity ${
                ttsText.trim() ? 'accent' : 'surface opacity-50 cursor-not-allowed'
              }`}
              aria-label={isSpeaking ? 'Detener lectura en voz alta' : 'Leer en voz alta'}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isSpeaking ? 'stop' : 'volume_up'}
              </span>
              {isSpeaking ? 'Detener' : 'Leer en voz alta'}
            </button>
          </div>
        </div>
      </section>

      {/* REPRODUCTOR MINIATURA */}
      {showMiniPlayer && (
        <footer className="fixed bottom-0 left-0 right-0 p-3 bg-black/30 backdrop-blur-lg flex items-center justify-between z-30" aria-label="Mini reproductor">
          <div className="flex items-center gap-3">
            <img src="https://i.postimg.cc/gnr0cmPb/gnr0cmPb.jpg" className="w-12 h-12 rounded-md" alt="mini cover" />
            <div>
              <p className="font-medium">El gato con botas</p>
              <p className="text-xs opacity-60">Charles Perrault</p>
            </div>
          </div>
          <button onClick={togglePlay} className="accent p-3 rounded-full" aria-label="Reproducir/pausar">
            <span className="material-symbols-outlined">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
        </footer>
      )}

      {/* PANEL MODAL DE APARIENCIA */}
      {isThemePanelOpen && (
        <div className="fixed inset-0 z-50 flex items-start" role="dialog" aria-modal="true" aria-labelledby="themeTitle">
          <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={() => setIsThemePanelOpen(false)}></div>
          <div className="relative w-full p-6 rounded-b-2xl bg-[var(--card)] shadow-xl transition-transform transform translate-y-0">
            <div className="flex justify-between items-center mb-4">
              <h3 id="themeTitle" className="font-bold text-lg">Apariencia</h3>
              <button onClick={() => setIsThemePanelOpen(false)} aria-label="Cerrar panel de apariencia">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentMode('night'); setIsThemePanelOpen(false); }}>
                <button className="w-10 h-10 surface rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined icon-var">dark_mode</span>
                </button>
                <p>Noche púrpura</p>
              </div>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentMode('day'); setIsThemePanelOpen(false); }}>
                <button className="w-10 h-10 surface rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined icon-var">light_mode</span>
                </button>
                <p>Día claro</p>
              </div>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentMode('black'); setIsThemePanelOpen(false); }}>
                <button className="w-10 h-10 surface rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined icon-var">dark_mode</span>
                </button>
                <p>Negro total</p>
              </div>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setCurrentMode('contrast'); setIsThemePanelOpen(false); }}>
                <button className="w-10 h-10 surface rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined icon-var">visibility</span>
                </button>
                <p>Alto contraste</p>
              </div>
              
              <div className="pt-2">
                <label className="block text-sm font-medium mb-1">Ajuste manual</label>
                <input type="range" min="0" max="100" defaultValue="55" className="w-full" aria-label="Ajuste manual de oscurecimiento"/>
                <div className="text-xs opacity-70 mt-1">Ajusta la oscuridad del fondo</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
