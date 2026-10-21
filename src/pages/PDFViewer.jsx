import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function PDFViewer() {
  const navigate = useNavigate();
  const { currentMode } = useTheme();

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(false);
  const [docTitle, setDocTitle] = useState('Documento de Ejemplo: Cuentos Clásicos');
  const [extractedText, setExtractedText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [statusMessage, setStatusMessage] = useState('');

  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const fileInputRef = useRef(null);
  const utteranceRef = useRef(null);

  // Preload voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Load PDF.js script dynamically if not already present
  useEffect(() => {
    const loadPdfJs = async () => {
      if (window.pdfjsLib) return;
      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        script.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            loadSampleDocument();
          }
        };
        document.body.appendChild(script);
      } catch (e) {
        console.error('Error al cargar PDF.js:', e);
      }
    };

    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      loadSampleDocument();
    } else {
      loadPdfJs();
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Built-in sample PDF or fallback
  const loadSampleDocument = async () => {
    setLoading(true);
    setStatusMessage('Cargando documento de muestra...');
    try {
      // PDF de muestra accesible público
      const sampleUrl = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
      const loadingTask = window.pdfjsLib.getDocument({
        url: sampleUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPageNum(1);
      setDocTitle('TraceMonkey - Documento Demo');
      setStatusMessage('');
    } catch (err) {
      console.warn('No se pudo cargar el PDF remoto, usando modo lienzo interactivo demo:', err);
      renderFallbackDemo();
    } finally {
      setLoading(false);
    }
  };

  // Fallback demo when external network fails
  const renderFallbackDemo = () => {
    setNumPages(3);
    setPageNum(1);
    setDocTitle('El gato con botas — Muestra');
    const demoTexts = [
      'Capítulo 1: La herencia del molinero.\nHabía una vez un molinero que dejó a sus tres hijos como única herencia su molino, su asno y su gato. El reparto se hizo en seguida. El hijo mayor se quedó con el molino, el segundo con el asno y al más joven solo le tocó el gato.',
      'Capítulo 2: Las botas mágicas.\nEl gato, que oyó los lamentos de su amo, le dijo con aire serio y sosegado: "No te aflijas, amo mío; no tienes más que darme un saco y hacerme hacer un par de botas para ir por los matorrales, y ya verás que tu herencia no es tan poca cosa como piensas".',
      'Capítulo 3: El Marqués de Carabás.\nEl joven amo decidió confiar en las astucias del felino. El gato se calzó las botas, se echó el saco al hombro y se dirigió a un coto de conejos. Así comenzaron las aventuras que llevarían a su amo a convertirse en el gran Marqués de Carabás.'
    ];
    setExtractedText(demoTexts[0]);
    drawTextCanvas(demoTexts[0], 1);
  };

  const drawTextCanvas = (text, page) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 650;
    canvas.height = 800;

    // Background
    ctx.fillStyle = currentMode === 'day' ? '#FFFFFF' : '#1e1035';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Header
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 22px Sora, sans-serif';
    ctx.fillText('PDFReader — Visor Accesible', 40, 60);

    ctx.fillStyle = currentMode === 'day' ? '#111827' : '#E0E0E0';
    ctx.font = 'bold 18px Sora, sans-serif';
    ctx.fillText(`Página ${page}`, 40, 100);

    // Lines of text
    ctx.font = '16px Sora, sans-serif';
    const lines = text.split('\n');
    let y = 150;
    lines.forEach((line) => {
      const words = line.split(' ');
      let curLine = '';
      words.forEach((w) => {
        const testLine = curLine + w + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 550 && curLine !== '') {
          ctx.fillText(curLine, 40, y);
          curLine = w + ' ';
          y += 28;
        } else {
          curLine = testLine;
        }
      });
      ctx.fillText(curLine, 40, y);
      y += 35;
    });
  };

  // Render current PDF page
  useEffect(() => {
    if (!pdfDoc) return;

    let isMounted = true;
    const renderPage = async () => {
      setLoading(true);
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        if (!isMounted) return;

        // Extract text for TTS
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        setExtractedText(pageText || 'Página visual sin texto seleccionable.');

        // Render Canvas
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error al renderizar página PDF:', err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale]);

  // Handle local PDF file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor selecciona un archivo PDF válido.');
      return;
    }

    setDocTitle(file.name);
    setLoading(true);
    setStatusMessage('Cargando archivo local...');

    const fileReader = new FileReader();
    fileReader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        if (window.pdfjsLib) {
          const loadingTask = window.pdfjsLib.getDocument({ data: typedarray });
          const doc = await loadingTask.promise;
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setPageNum(1);
          setStatusMessage('');
        } else {
          alert('El motor PDF.js se está inicializando. Intenta de nuevo en unos segundos.');
        }
      } catch (err) {
        console.error('Error al procesar PDF:', err);
        alert('No se pudo abrir el documento PDF seleccionado.');
      } finally {
        setLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  // TTS Read Aloud function
  const toggleReadAloud = () => {
    if (!window.speechSynthesis) {
      alert('Tu navegador no soporta síntesis de voz (Web Speech API).');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = (extractedText && extractedText.trim().length > 0)
      ? extractedText
      : `Página ${pageNum} de ${docTitle}. Lectura de documento asistida.`;

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utteranceRef.current = utterance;
        window.__activeUtterance = utterance; // Evita el bug de Garbage Collection en V8

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
        console.error('Error al iniciar lectura por voz:', err);
        setIsSpeaking(false);
      }
    }, 60);
  };

  // Navigation handlers
  const handlePrevPage = () => {
    if (pageNum > 1) {
      if (isSpeaking) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setPageNum(pageNum - 1);
    }
  };

  const handleNextPage = () => {
    if (pageNum < numPages) {
      if (isSpeaking) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setPageNum(pageNum + 1);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.6));

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {/* HEADER */}
      <header
        className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-white/10"
        role="banner"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-full card flex items-center justify-center"
            title="Volver a Inicio"
            aria-label="Volver a la pantalla principal"
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-bold leading-none">PDFReader</h1>
            <p className="text-xs opacity-70 truncate max-w-[200px] sm:max-w-md">{docTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="hidden"
            id="pdfFileInput"
          />
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="accent px-3 py-2 rounded-lg flex items-center gap-1 text-sm font-semibold"
            title="Cargar archivo PDF local"
            aria-label="Cargar archivo PDF local"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">upload_file</span>
            <span className="hidden sm:inline">Cargar PDF</span>
          </button>
        </div>
      </header>

      {/* TOOLBAR CONTROLES */}
      <nav
        className="sticky top-[57px] z-30 bg-[var(--card)]/90 backdrop-blur-md px-4 py-2 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shadow-md"
        aria-label="Controles de navegación y lectura del visor"
      >
        {/* Paginación */}
        <div className="flex items-center gap-2" role="group" aria-label="Navegación de páginas">
          <button
            onClick={handlePrevPage}
            disabled={pageNum <= 1 || loading}
            className="p-2 rounded-lg surface disabled:opacity-40 flex items-center justify-center"
            aria-label="Página anterior"
            title="Página anterior"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>

          <span className="text-sm font-semibold px-2 py-1 surface rounded-md" aria-live="polite">
            {pageNum} / {numPages || 1}
          </span>

          <button
            onClick={handleNextPage}
            disabled={pageNum >= numPages || loading}
            className="p-2 rounded-lg surface disabled:opacity-40 flex items-center justify-center"
            aria-label="Página siguiente"
            title="Página siguiente"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1" role="group" aria-label="Control de escala">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg surface flex items-center justify-center"
            aria-label="Disminuir zoom"
            title="Alejar (-)"
          >
            <span className="material-symbols-outlined" aria-hidden="true">zoom_out</span>
          </button>

          <span className="text-xs font-semibold px-2 surface rounded py-1">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg surface flex items-center justify-center"
            aria-label="Aumentar zoom"
            title="Acercar (+)"
          >
            <span className="material-symbols-outlined" aria-hidden="true">zoom_in</span>
          </button>
        </div>

        {/* Text to Speech Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleReadAloud}
            className={`px-3 py-2 rounded-full flex items-center gap-1.5 text-sm font-semibold transition-all ${
              isSpeaking ? 'bg-red-600 text-white animate-pulse' : 'accent'
            }`}
            aria-label={isSpeaking ? 'Detener lectura en voz alta' : 'Leer página actual en voz alta'}
            title="Lectura asistida por voz"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              {isSpeaking ? 'stop' : 'volume_up'}
            </span>
            <span>{isSpeaking ? 'Pausar Voz' : 'Leer Página'}</span>
          </button>

          <div className="hidden md:flex items-center gap-1 text-xs surface px-2 py-1.5 rounded-lg">
            <span>Vel:</span>
            <select
              value={ttsRate}
              onChange={(e) => setTtsRate(parseFloat(e.target.value))}
              className="bg-transparent text-xs outline-none"
              aria-label="Velocidad de síntesis de voz"
            >
              <option value="0.75" className="bg-[var(--card)]">0.75x</option>
              <option value="1" className="bg-[var(--card)]">1.0x</option>
              <option value="1.25" className="bg-[var(--card)]">1.25x</option>
              <option value="1.5" className="bg-[var(--card)]">1.5x</option>
            </select>
          </div>
        </div>
      </nav>

      {/* ÁREA PRINCIPAL DEL VISOR */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center overflow-auto" role="main">
        {statusMessage && (
          <div className="mb-4 text-xs surface px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="relative max-w-full overflow-auto rounded-xl shadow-2xl p-2 surface border border-white/10 flex justify-center">
          {loading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl animate-spin text-[var(--primary)]">
                  progress_activity
                </span>
                <span className="text-sm font-medium">Renderizando página...</span>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="max-w-full h-auto block rounded-lg transition-transform duration-150"
            aria-label={`Visualización de la página ${pageNum}`}
            role="img"
          />
        </div>

        {/* Transcripción de texto accesible para lectores de pantalla o revisión */}
        {extractedText && (
          <section
            className="max-w-3xl w-full mt-6 card p-4 rounded-xl"
            aria-labelledby="textExtractTitle"
          >
            <h2 id="textExtractTitle" className="text-sm font-bold mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base icon-var">subject</span>
              Texto extraído de la página (Accesibilidad / Lectura)
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed opacity-85 select-text">
              {extractedText}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
