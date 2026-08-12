import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import confetti from 'canvas-confetti';
import { 
  Upload, 
  FileText, 
  PenTool, 
  Download, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  RotateCcw,
  Sparkles,
  Move
} from 'lucide-react';

export default function App() {
  const [file, setFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDocProxy, setPdfDocProxy] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Signature Pad State
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [savedSignatureUrl, setSavedSignatureUrl] = useState(null);
  
  // Placed Signatures array [{ id, x, y, width, height, page, signatureUrl }]
  const [signatures, setSignatures] = useState([]);
  const [activeSigId, setActiveSigId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const sigCanvasRef = useRef(null);
  const pdfRenderCanvasRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize PDF.js worker dynamically from CDN
  useEffect(() => {
    if (window.pdfjsLib) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    };
    document.body.appendChild(script);
  }, []);

  // Handle PDF File Upload
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      const arrayBuffer = await selectedFile.arrayBuffer();
      setPdfBytes(arrayBuffer);
      setSignatures([]);
      
      // Load with PDF.js for rendering (pass a copy slice so PDF.js worker doesn't detach arrayBuffer)
      if (window.pdfjsLib) {
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
        const pdf = await loadingTask.promise;
        setPdfDocProxy(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      }
    }
  };

  // Render PDF Page onto Canvas
  useEffect(() => {
    if (!pdfDocProxy || !pdfRenderCanvasRef.current) return;

    const renderPage = async () => {
      const page = await pdfDocProxy.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = pdfRenderCanvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      await page.render(renderContext).promise;
    };

    renderPage();
  }, [pdfDocProxy, currentPage]);

  // Drawing Handlers for Signature Pad
  const startDrawing = (e) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignaturePad = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSavedSignatureUrl(null);
  };

  const confirmSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSavedSignatureUrl(dataUrl);

    // Place new signature on current page
    const newSig = {
      id: Date.now(),
      x: 100,
      y: 100,
      width: 150,
      height: 60,
      page: currentPage,
      signatureUrl: dataUrl
    };

    setSignatures(prev => [...prev, newSig]);
  };

  // Dragging Signature on Document
  const handleMouseDownOnSig = (e, sig) => {
    e.stopPropagation();
    setActiveSigId(sig.id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - sig.x,
      y: e.clientY - sig.y
    });
  };

  const handleMouseMoveOnDoc = (e) => {
    if (!isDragging || !activeSigId) return;
    const bounds = pdfRenderCanvasRef.current.getBoundingClientRect();
    
    setSignatures(prev => prev.map(sig => {
      if (sig.id !== activeSigId) return sig;

      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      newX = Math.max(0, Math.min(newX, bounds.width - sig.width));
      newY = Math.max(0, Math.min(newY, bounds.height - sig.height));

      return {
        ...sig,
        x: newX,
        y: newY
      };
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setActiveSigId(null);
  };

  const removeSignature = (id) => {
    setSignatures(prev => prev.filter(s => s.id !== id));
  };

  // Export Signed PDF
  const handleDownloadSignedPdf = async () => {
    if (!pdfBytes || signatures.length === 0) {
      alert('Please place at least one signature before downloading.');
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const canvas = pdfRenderCanvasRef.current;

      if (!canvas) {
        throw new Error('PDF canvas render reference not ready.');
      }

      for (const sig of signatures) {
        const targetPage = pages[sig.page - 1];
        if (!targetPage) continue;

        // Convert base64 data URL to Uint8Array directly
        const base64Data = sig.signatureUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const signatureImage = await pdfDoc.embedPng(bytes);

        const { width: pageWidth, height: pageHeight } = targetPage.getSize();
        const scaleX = pageWidth / canvas.width;
        const scaleY = pageHeight / canvas.height;

        const pdfX = sig.x * scaleX;
        const pdfY = pageHeight - (sig.y * scaleY) - (sig.height * scaleY);

        targetPage.drawImage(signatureImage, {
          x: pdfX,
          y: pdfY,
          width: sig.width * scaleX,
          height: sig.height * scaleY,
        });
      }

      const signedPdfBytes = await pdfDoc.save();

      // Reliable cross-browser Blob download trigger
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Signed_${file?.name || 'document.pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1000);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert(`Error generating signed PDF: ${err.message}`);
    }
  };

  return (
    <div onMouseMove={handleMouseMoveOnDoc} onMouseUp={handleMouseUp}>
      <header className="app-header">
        <div className="logo-container">
          <PenTool className="logo-icon" />
          <span className="logo-text">SignAgy PDF</span>
        </div>
        {file && (
          <button className="btn btn-primary" onClick={handleDownloadSignedPdf} disabled={signatures.length === 0}>
            <Download size={18} /> Download Signed PDF
          </button>
        )}
      </header>

      <main className="main-container">
        {!file ? (
          <div className="dropzone" onClick={() => document.getElementById('pdf-input').click()}>
            <Upload className="dropzone-icon" />
            <h2>Upload a PDF Document</h2>
            <p style={{ color: 'var(--text-muted)' }}>Click or drop your PDF document here to start signing</p>
            <input 
              id="pdf-input" 
              type="file" 
              accept="application/pdf" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
            />
          </div>
        ) : (
          <div className="workspace-grid">
            {/* PDF Viewport */}
            <div className="doc-preview-card">
              <div className="preview-container" ref={containerRef}>
                <div className="pdf-canvas-wrapper">
                  <canvas ref={pdfRenderCanvasRef} />

                  {/* Render Signatures mapped to active page */}
                  {signatures
                    .filter(sig => sig.page === currentPage)
                    .map(sig => (
                      <div
                        key={sig.id}
                        className={`placed-signature ${activeSigId === sig.id ? 'active' : ''}`}
                        style={{
                          left: `${sig.x}px`,
                          top: `${sig.y}px`,
                          width: `${sig.width}px`,
                          height: `${sig.height}px`,
                        }}
                        onMouseDown={(e) => handleMouseDownOnSig(e, sig)}
                      >
                        <img 
                          src={sig.signatureUrl} 
                          alt="Signature" 
                          style={{ width: '100%', height: '100%', pointerEvents: 'none' }} 
                        />
                        <div 
                          style={{ position: 'absolute', top: -10, right: -10, background: '#ef4444', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSignature(sig.id);
                          }}
                        >
                          ✕
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Pagination Controls */}
              {numPages > 1 && (
                <div className="page-controls">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span>Page {currentPage} of {numPages}</span>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, numPages))}
                    disabled={currentPage === numPages}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Signature Tools Sidebar */}
            <div className="tools-card">
              <h3 className="section-title">
                <PenTool size={20} /> Draw Signature
              </h3>

              <div className="signature-pad-wrapper">
                <canvas 
                  ref={sigCanvasRef} 
                  className="signature-pad-canvas"
                  width={290}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ink Color</label>
                <div className="color-picker">
                  {['#000000', '#1e40af', '#b91c1c'].map(color => (
                    <div 
                      key={color} 
                      className={`color-swatch ${penColor === color ? 'selected' : ''}`} 
                      style={{ backgroundColor: color }}
                      onClick={() => setPenColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={clearSignaturePad}>
                  <RotateCcw size={16} /> Clear
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmSignature}>
                  <Check size={16} /> Apply
                </button>
              </div>

              {signatures.length > 0 && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} /> {signatures.length} signature(s) placed across pages. Drag to reposition.
                </div>
              )}

              <button 
                className="btn btn-danger" 
                style={{ marginTop: 'auto' }}
                onClick={() => {
                  setFile(null);
                  setPdfBytes(null);
                  setSavedSignatureUrl(null);
                  setSignatures([]);
                }}
              >
                <Trash2 size={16} /> Remove Document
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
