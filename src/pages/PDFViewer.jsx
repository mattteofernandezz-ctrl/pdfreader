/**
 * ============================================================================
 * PROYECTO: PDFReader — PWA para Lectura Accesible y Multisensorial
 * COMPONENTE FORMATIVO: Codificación de Módulos del Sistema de Información
 * MÓDULO: Módulo de Lectura, Visualización de PDF y Síntesis de Voz (TTS)
 * ============================================================================
 * 
 * TRAZABILIDAD CON EL CICLO DE VIDA DEL SOFTWARE:
 * ----------------------------------------------------------------------------
 * • Requerimientos Funcionales (RF):
 *   - RF-001: Visualización digital de documentos en formato PDF mediante lienzo canvas.
 *   - RF-002: Carga y lectura de archivos .pdf locales desde el almacenamiento del usuario.
 *   - RF-003: Controles de navegación de páginas (anterior/siguiente) y ajuste de escala (zoom).
 *   - RF-004: Lectura asistida por voz (Text-to-Speech) del texto extraído de la página activa.
 * 
 * • Requerimientos No Funcionales (RNF):
 *   - RNF-001: Accesibilidad universal basada en pautas WCAG 2.1 AA (atributos ARIA, 
 *     navegación integral por teclado, alertas audibles y alto contraste dinámico).
 *   - RNF-002: Eficiencia en dispositivos de gama baja (renderizado progresivo, manejo
 *     seguro de memoria y prevención de fugas de recursos).
 * 
 * • Historias de Usuario (HU):
 *   - HU-02: Como usuario con dificultades visuales o de concentración, quiero visualizar
 *     documentos PDF de forma limpia y ajustar el tamaño para facilitar mi lectura.
 *   - HU-03: Como usuario con discapacidad o fatiga lectora, quiero que el sistema lea en
 *     voz alta el texto del documento para acceder al conocimiento auditivamente.
 * 
 * • Casos de Uso (CU):
 *   - CU-02: Visualizar y Explorar Documento PDF.
 *   - CU-03: Ejecutar Lectura Asistida mediante Síntesis de Voz (Web Speech API).
 * 
 * • Estándares de Codificación:
 *   - Clean Code & Patrones Funcionales en React 19.
 *   - Documentación técnica bajo estándar JSDoc.
 *   - Manejo resiliente contra el Garbage Collector de V8/Chromium.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

/**
 * Constantes de configuración del visor y límites operativos.
 * @constant {Object}
 */
const CONFIG = {
  MIN_SCALE: 0.6,
  MAX_SCALE: 2.5,
  SCALE_STEP: 0.2,
  DEFAULT_SCALE: 1.2,
  PDFJS_CDN_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  PDFJS_WORKER_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  PDFJS_CMAPS_URL: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
  FALLBACK_DEMO_TEXTS: [
    'Capítulo 1: La herencia del molinero.\nHabía una vez un molinero que dejó a sus tres hijos como única herencia su molino, su asno y su gato. El reparto se hizo en seguida. El hijo mayor se quedó con el molino, el segundo con el asno y al más joven solo le tocó el gato.',
    'Capítulo 2: Las botas mágicas.\nEl gato, que oyó los lamentos de su amo, le dijo con aire serio y sosegado: "No te aflijas, amo mío; no tienes más que darme un saco y hacerme hacer un par de botas para ir por los matorrales, y ya verás que tu herencia no es tan poca cosa como piensas".',
    'Capítulo 3: El Marqués de Carabás.\nEl joven amo decidió confiar en las astucias del felino. El gato se calzó las botas, se echó el saco al hombro y se dirigió a un coto de conejos. Así comenzaron las aventuras que llevarían a su amo a convertirse en el gran Marqués de Carabás.'
  ]
};

/**
 * Componente principal del Visor de Documentos PDF y Lector Asistido.
 * 
 * Provee la interfaz integral para cargar archivos, renderizar páginas con PDF.js,
 * navegar, ampliar/reducir escala y verbalizar el texto mediante Web Speech API.
 * 
 * @component
 * @returns {JSX.Element} Vista del lector PDF accesible.
 */
export default function PDFViewer() {
  const navigate = useNavigate();
  const { currentMode } = useTheme();

  // --------------------------------------------------------------------------
  // ESTADOS DEL COMPONENTE (Manejo Reactivo)
  // --------------------------------------------------------------------------
  /** @type {[any, Function]} Instancia del documento PDF procesado por PDF.js */
  const [pdfDoc, setPdfDoc] = useState(null);

  /** @type {[number, Function]} Número de la página actualmente visualizada */
  const [pageNum, setPageNum] = useState(1);

  /** @type {[number, Function]} Total de páginas disponibles en el documento */
  const [numPages, setNumPages] = useState(0);

  /** @type {[number, Function]} Factor de escala o ampliación visual (Zoom) */
  const [scale, setScale] = useState(CONFIG.DEFAULT_SCALE);

  /** @type {[boolean, Function]} Indicador de procesamiento o renderizado en curso */
  const [loading, setLoading] = useState(false);

  /** @type {[string, Function]} Nombre o título del documento activo */
  const [docTitle, setDocTitle] = useState('Documento de Ejemplo: Cuentos Clásicos');

  /** @type {[string, Function]} Texto plano extraído de la página para accesibilidad y TTS */
  const [extractedText, setExtractedText] = useState('');

  /** @type {[boolean, Function]} Estado de reproducción del sintetizador de voz */
  const [isSpeaking, setIsSpeaking] = useState(false);

  /** @type {[number, Function]} Velocidad de locución de la síntesis (0.75x a 1.5x) */
  const [ttsRate, setTtsRate] = useState(1.0);

  /** @type {[string, Function]} Mensaje de estado informativo para el usuario */
  const [statusMessage, setStatusMessage] = useState('');

  // --------------------------------------------------------------------------
  // REFERENCIAS DOM Y CICLO DE VIDA (useRef)
  // --------------------------------------------------------------------------
  /** @type {React.MutableRefObject<HTMLCanvasElement|null>} Lienzo de renderizado */
  const canvasRef = useRef(null);

  /** @type {React.MutableRefObject<any>} Tarea de renderizado activa de PDF.js */
  const renderTaskRef = useRef(null);

  /** @type {React.MutableRefObject<HTMLInputElement|null>} Input nativo de archivos */
  const fileInputRef = useRef(null);

  /** @type {React.MutableRefObject<SpeechSynthesisUtterance|null>} Instancia persistente para evitar GC de V8 */
  const utteranceRef = useRef(null);

  // --------------------------------------------------------------------------
  // EFECTOS SECUNDARIOS (Hooks de Inicialización)
  // --------------------------------------------------------------------------

  /**
   * Precarga de voces del sistema operativo para evitar retrasos en el primer clic de voz.
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  /**
   * Carga dinámica asíncrona del script de Mozilla PDF.js.
   * Evita bloqueos de bundling en Vite y garantiza compatibilidad PWA.
   */
  useEffect(() => {
    let isMounted = true;

    const initializePdfEngine = async () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDFJS_WORKER_URL;
        loadSampleDocument();
        return;
      }

      try {
        const script = document.createElement('script');
        script.src = CONFIG.PDFJS_CDN_URL;
        script.async = true;
        script.onload = () => {
          if (isMounted && window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDFJS_WORKER_URL;
            loadSampleDocument();
          }
        };
        script.onerror = () => {
          console.warn('[PDFViewer] Fallo al cargar script CDN de PDF.js. Activando respaldo interactivo.');
          if (isMounted) renderFallbackDemo();
        };
        document.body.appendChild(script);
      } catch (err) {
        console.error('[PDFViewer] Excepción en inicialización de PDF.js:', err);
        if (isMounted) renderFallbackDemo();
      }
    };

    initializePdfEngine();

    return () => {
      isMounted = false;
      // Detener cualquier locución activa al desmontar la vista
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Carga del documento PDF de demostración o activación del respaldo offline.
   * Cumple con RF-001 (Visualización inicial asistida).
   */
  const loadSampleDocument = async () => {
    setLoading(true);
    setStatusMessage('Cargando documento de muestra...');
    try {
      const sampleUrl = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
      const loadingTask = window.pdfjsLib.getDocument({
        url: sampleUrl,
        cMapUrl: CONFIG.PDFJS_CMAPS_URL,
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setPageNum(1);
      setDocTitle('TraceMonkey - Documento Demo Técnico');
      setStatusMessage('');
    } catch (err) {
      console.warn('[PDFViewer] No se pudo descargar el PDF remoto. Activando modo lienzo de respaldo:', err);
      renderFallbackDemo();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Genera una representación gráfica de contingencia directamente en el Canvas.
   * Permite probar paginación, zoom y TTS sin depender de red externa.
   * Cumple con RNF-002 (Tolerancia a fallos y modo offline).
   */
  const renderFallbackDemo = useCallback(() => {
    setNumPages(CONFIG.FALLBACK_DEMO_TEXTS.length);
    setPageNum(1);
    setDocTitle('El gato con botas — Cuento Accesible');
    const initialText = CONFIG.FALLBACK_DEMO_TEXTS[0];
    setExtractedText(initialText);
    drawTextCanvas(initialText, 1);
  }, [currentMode]);

  /**
   * Renderiza texto estilizado en el Canvas cuando se usa el modo demostrativo.
   * 
   * @param {string} text Contenido textual a pintar.
   * @param {number} page Número de página actual.
   */
  const drawTextCanvas = (text, page) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 650;
    canvas.height = 800;

    // Fondo adaptable al modo visual seleccionado
    ctx.fillStyle = currentMode === 'day' ? '#FFFFFF' : '#1e1035';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde delimitador con acento accesible
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Cabecera del documento
    ctx.fillStyle = '#8B5CF6';
    ctx.font = 'bold 22px Sora, sans-serif';
    ctx.fillText('PDFReader — Visor Accesible', 40, 60);

    ctx.fillStyle = currentMode === 'day' ? '#111827' : '#E0E0E0';
    ctx.font = 'bold 18px Sora, sans-serif';
    ctx.fillText(`Página ${page} de ${CONFIG.FALLBACK_DEMO_TEXTS.length}`, 40, 100);

    // Dibujo multilínea con salto automático de palabras
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

  // --------------------------------------------------------------------------
  // RENDERIZADO DE PÁGINAS PDF MEDIANTE CANVAS (Motor PDF.js)
  // --------------------------------------------------------------------------
  /**
   * Renderiza en alta fidelidad la página activa del PDF sobre el Canvas.
   * Extrae simultáneamente la capa de texto para el motor de síntesis y accesibilidad.
   * Cumple con RF-001 y RF-004.
   */
  useEffect(() => {
    // Si estamos en modo demostrativo sin documento PDF.js cargado
    if (!pdfDoc) {
      if (CONFIG.FALLBACK_DEMO_TEXTS[pageNum - 1]) {
        const text = CONFIG.FALLBACK_DEMO_TEXTS[pageNum - 1];
        setExtractedText(text);
        drawTextCanvas(text, pageNum);
      }
      return;
    }

    let isMounted = true;

    const renderPage = async () => {
      setLoading(true);
      try {
        // Cancelar tarea previa si el usuario cambia rápidamente de página
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        if (!isMounted) return;

        // 1. Extracción semántica de texto para TTS y lectores de pantalla
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        setExtractedText(pageText || 'Página visual o gráfica sin texto seleccionable.');

        // 2. Cálculo de dimensiones geométricas con factor de escala (Zoom)
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // 3. Ejecución del renderizado vectorial de PDF.js
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('[PDFViewer] Error al renderizar página PDF:', err);
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
  }, [pdfDoc, pageNum, scale, currentMode]);

  // --------------------------------------------------------------------------
  // CONTROLADORES DE EVENTOS (Handlers)
  // --------------------------------------------------------------------------

  /**
   * Procesa la carga de archivos locales desde el equipo del usuario.
   * Valida tipo MIME (.pdf) y transfiere los bytes a PDF.js mediante FileReader.
   * Cumple con RF-002 (Carga de archivos locales).
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e Evento de cambio en el input file.
   */
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Formato no válido. Por favor selecciona un archivo con extensión .pdf.');
      return;
    }

    setDocTitle(file.name);
    setLoading(true);
    setStatusMessage('Procesando archivo local...');

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
          alert('El motor PDF.js está inicializándose. Por favor intenta de nuevo en unos segundos.');
        }
      } catch (err) {
        console.error('[PDFViewer] Error al abrir el PDF local:', err);
        alert('No fue posible abrir el documento seleccionado. Verifique que no esté corrupto o protegido.');
      } finally {
        setLoading(false);
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  /**
   * Conmuta la lectura en voz alta (Text-to-Speech) de la página activa.
   * 
   * Implementa mecanismos avanzados de resiliencia:
   * 1. Garbage Collection Shield: Evita que V8 destruya el SpeechSynthesisUtterance antes de hablar.
   * 2. Voice Detection: Detecta voces nativas en español ('es-*', 'Spanish') o usa respaldo del sistema.
   * 3. Resume State: Recupera la reproducción si el navegador la dejó en pausa.
   * 
   * Cumple con RF-004 y RNF-001 (Lectura inclusiva).
   */
  const toggleReadAloud = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Tu navegador web no soporta la síntesis de voz (Web Speech API).');
      return;
    }

    // Si ya está hablando, se detiene inmediatamente
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = (extractedText && extractedText.trim().length > 0)
      ? extractedText
      : `Página ${pageNum} de ${docTitle}. Documento sin texto legible por el sintetizador.`;

    // Limpieza de cola previa
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    // Pequeño retardo para asegurar que cancel() finalizó en Chromium
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        
        // Blindaje contra recolección de basura
        utteranceRef.current = utterance;
        window.__activeUtterance = utterance;

        // Búsqueda inteligente de voz en español
        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find((v) => v.lang.toLowerCase().startsWith('es') || v.name.toLowerCase().includes('spanish'))
                          || voices.find((v) => v.default)
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
          window.__activeUtterance = null;
        };
        utterance.onerror = (e) => {
          console.warn('[PDFViewer TTS] Evento de error o cancelación:', e);
          setIsSpeaking(false);
          utteranceRef.current = null;
          window.__activeUtterance = null;
        };

        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);

        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (err) {
        console.error('[PDFViewer] Error al ejecutar síntesis de voz:', err);
        setIsSpeaking(false);
      }
    }, 60);
  };

  /**
   * Navega a la página anterior en el documento.
   * Cancela la locución activa para no generar desfases sonoros.
   */
  const handlePrevPage = () => {
    if (pageNum > 1) {
      if (isSpeaking && window.speechSynthesis) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setPageNum((prev) => prev - 1);
    }
  };

  /**
   * Navega a la página siguiente en el documento.
   * Cancela la locución activa para no generar desfases sonoros.
   */
  const handleNextPage = () => {
    if (pageNum < numPages) {
      if (isSpeaking && window.speechSynthesis) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setPageNum((prev) => prev + 1);
    }
  };

  /**
   * Incrementa la escala visual (Zoom In).
   */
  const handleZoomIn = () => setScale((prev) => Math.min(prev + CONFIG.SCALE_STEP, CONFIG.MAX_SCALE));

  /**
   * Disminuye la escala visual (Zoom Out).
   */
  const handleZoomOut = () => setScale((prev) => Math.max(prev - CONFIG.SCALE_STEP, CONFIG.MIN_SCALE));

  // --------------------------------------------------------------------------
  // ACCESIBILIDAD POR TECLADO (WCAG 2.1 AA)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar captura si el usuario está interactuando con un input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === 'Escape') {
        if (isSpeaking && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNum, numPages, isSpeaking]);

  // --------------------------------------------------------------------------
  // ESTRUCTURA VISUAL / RENDERIZADO DEL COMPONENTE (JSX)
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col pb-16 bg-[var(--bg)] text-[var(--text)]">
      
      {/* =====================================================================
          1. HEADER PRINCIPAL Y BRANDING PERSISTENTE (Cumple con CU-01 y RNF-001)
          ===================================================================== */}
      <header
        className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-white/10"
        role="banner"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-full card flex items-center justify-center hover:opacity-80 transition-opacity"
            title="Volver al Inicio"
            aria-label="Volver a la pantalla principal"
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight">PDFReader</h1>
            <p className="text-xs opacity-70 truncate max-w-[200px] sm:max-w-md font-normal" title={docTitle}>
              {docTitle}
            </p>
          </div>
        </div>

        {/* Acción de carga de archivos (RF-002) */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,application/pdf"
            className="hidden"
            id="pdfFileInput"
            aria-label="Seleccionar archivo PDF local"
          />
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="accent px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
            title="Cargar archivo PDF desde el dispositivo"
            aria-label="Cargar archivo PDF local"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">upload_file</span>
            <span className="hidden sm:inline">Cargar PDF</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. BARRA DE HERRAMIENTAS Y CONTROLES OPERATIVOS (RF-003, RF-004)
          ===================================================================== */}
      <nav
        className="sticky top-[57px] z-30 bg-[var(--card)]/90 backdrop-blur-md px-4 py-2 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shadow-md"
        aria-label="Barra de herramientas de navegación, zoom y lectura asistida"
      >
        {/* Controles de paginación (RF-003) */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Navegación de páginas">
          <button
            onClick={handlePrevPage}
            disabled={pageNum <= 1 || loading}
            className="p-2 rounded-lg surface disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center hover:bg-white/5 transition-colors"
            aria-label="Página anterior (Flecha Izquierda)"
            title="Página anterior"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_left</span>
          </button>

          <span className="text-xs sm:text-sm font-semibold px-2.5 py-1.5 surface rounded-md" aria-live="polite">
            {pageNum} / {numPages || 1}
          </span>

          <button
            onClick={handleNextPage}
            disabled={pageNum >= numPages || loading}
            className="p-2 rounded-lg surface disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center hover:bg-white/5 transition-colors"
            aria-label="Página siguiente (Flecha Derecha)"
            title="Página siguiente"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_right</span>
          </button>
        </div>

        {/* Controles de Escala / Zoom (RF-003) */}
        <div className="flex items-center gap-1" role="group" aria-label="Control de escala visual">
          <button
            onClick={handleZoomOut}
            disabled={scale <= CONFIG.MIN_SCALE}
            className="p-2 rounded-lg surface disabled:opacity-30 flex items-center justify-center hover:bg-white/5 transition-colors"
            aria-label="Disminuir escala de visualización"
            title="Alejar (-)"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">zoom_out</span>
          </button>

          <span className="text-xs font-semibold px-2 surface rounded py-1.5 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={scale >= CONFIG.MAX_SCALE}
            className="p-2 rounded-lg surface disabled:opacity-30 flex items-center justify-center hover:bg-white/5 transition-colors"
            aria-label="Aumentar escala de visualización"
            title="Acercar (+)"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">zoom_in</span>
          </button>
        </div>

        {/* Controles de Síntesis de Voz Asistida (RF-004, RNF-001) */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleReadAloud}
            className={`px-3.5 py-2 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all shadow-md ${
              isSpeaking ? 'bg-red-600 text-white animate-pulse' : 'accent'
            }`}
            aria-label={isSpeaking ? 'Detener locución de la página' : 'Leer página actual en voz alta'}
            title="Lectura asistida mediante síntesis de voz"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              {isSpeaking ? 'stop' : 'volume_up'}
            </span>
            <span>{isSpeaking ? 'Pausar Voz' : 'Leer Página'}</span>
          </button>

          {/* Calibrador de velocidad TTS */}
          <div className="hidden sm:flex items-center gap-1 text-xs surface px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="opacity-70">Vel:</span>
            <select
              value={ttsRate}
              onChange={(e) => setTtsRate(parseFloat(e.target.value))}
              className="bg-transparent text-xs font-semibold outline-none cursor-pointer"
              aria-label="Calibrar velocidad de habla"
            >
              <option value="0.75" className="bg-[var(--card)] text-[var(--text)]">0.75x</option>
              <option value="1.0" className="bg-[var(--card)] text-[var(--text)]">1.0x</option>
              <option value="1.25" className="bg-[var(--card)] text-[var(--text)]">1.25x</option>
              <option value="1.5" className="bg-[var(--card)] text-[var(--text)]">1.5x</option>
            </select>
          </div>
        </div>
      </nav>

      {/* =====================================================================
          3. ÁREA PRINCIPAL: LIENZO DE RENDERIZADO Y TEXTO ACCESIBLE (RF-001)
          ===================================================================== */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center overflow-auto" role="main">
        
        {/* Notificación de carga / estado */}
        {statusMessage && (
          <div className="mb-4 text-xs surface px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm border border-white/10" aria-live="polite">
            <span className="material-symbols-outlined text-sm animate-spin text-[var(--primary)]">refresh</span>
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Contenedor del Canvas con overlay de carga */}
        <div className="relative max-w-full overflow-auto rounded-xl shadow-2xl p-2 surface border border-white/10 flex justify-center">
          {loading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl" aria-live="assertive">
              <div className="flex flex-col items-center gap-2 p-4 surface rounded-xl border border-white/10">
                <span className="material-symbols-outlined text-4xl animate-spin text-[var(--primary)]">
                  progress_activity
                </span>
                <span className="text-xs sm:text-sm font-semibold">Procesando página...</span>
              </div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="max-w-full h-auto block rounded-lg transition-transform duration-150 shadow-inner"
            aria-label={`Visualización gráfica de la página ${pageNum}`}
            role="img"
          />
        </div>

        {/* =====================================================================
            4. TRANSCRIPCIÓN ACCESIBLE PARA LECTORES DE PANTALLA (RNF-001)
            ===================================================================== */}
        {extractedText && (
          <section
            className="max-w-3xl w-full mt-6 card p-4 rounded-xl border border-white/5"
            aria-labelledby="textExtractHeading"
          >
            <h2 id="textExtractHeading" className="text-xs sm:text-sm font-bold mb-2 flex items-center gap-2 text-[var(--primary)]">
              <span className="material-symbols-outlined text-base" aria-hidden="true">subject</span>
              Transcripción y Capa de Texto Accesible (WCAG 2.1 AA)
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed opacity-85 select-text font-normal">
              {extractedText}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
