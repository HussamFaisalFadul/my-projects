import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);

  const [status, setStatus] = useState<'loading' | 'scanning' | 'detected' | 'error'>('loading');
  const [detectedCode, setDetectedCode] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [useZXing, setUseZXing] = useState(false);
  const [zxingLoaded, setZxingLoaded] = useState(false);
  const zxingReaderRef = useRef<any>(null);

  // --- load ZXing dynamically as fallback ---
  useEffect(() => {
    if ('BarcodeDetector' in window) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js';
    script.onload = () => {
      setZxingLoaded(true);
      setUseZXing(true);
    };
    script.onerror = () => setStatus('error');
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  // --- start camera ---
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        torchTrackRef.current = track;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStatus('scanning');
      } catch {
        setStatus('error');
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  // --- scanning loop (native BarcodeDetector) ---
  useEffect(() => {
    if (status !== 'scanning' || useZXing) return;
    if (!('BarcodeDetector' in window)) { setUseZXing(true); return; }

    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'data_matrix'],
    });

    let active = true;

    async function detect() {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && active) {
          handleDetected(barcodes[0].rawValue);
          return;
        }
      } catch {}
      animFrameRef.current = requestAnimationFrame(detect);
    }

    animFrameRef.current = requestAnimationFrame(detect);
    return () => { active = false; cancelAnimationFrame(animFrameRef.current); };
  }, [status, useZXing]);

  // --- ZXing scanning ---
  useEffect(() => {
    if (!useZXing || !zxingLoaded || status !== 'scanning') return;
    const ZXing = (window as any).ZXing;
    if (!ZXing) return;

    const reader = new ZXing.BrowserMultiFormatReader();
    zxingReaderRef.current = reader;

    reader.decodeFromVideoElement(videoRef.current, (result: any, err: any) => {
      if (result) handleDetected(result.getText());
    }).catch(() => setStatus('error'));

    return () => { reader.reset(); };
  }, [useZXing, zxingLoaded, status]);

  function handleDetected(code: string) {
    cancelAnimationFrame(animFrameRef.current);
    setDetectedCode(code);
    setStatus('detected');

    // draw green box on canvas if supported
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
      }
    }

    setTimeout(() => {
      stopCamera();
      onDetected(code);
      onClose();
    }, 900);
  }

  function stopCamera() {
    cancelAnimationFrame(animFrameRef.current);
    zxingReaderRef.current?.reset?.();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  async function toggleTorch() {
    const track = torchTrackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(v => !v);
    } catch {}
  }

  return (
    <div className="bs-overlay" onClick={onClose}>
      <div className="bs-modal" onClick={e => e.stopPropagation()}>

        <div className="bs-header">
          <div>
            <p className="bs-kicker">مسح ضوئي</p>
            <h2 className="bs-title">ماسح الباركود</h2>
          </div>
          <button className="bs-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="bs-camera-wrap">
          <video ref={videoRef} className="bs-video" playsInline muted />
          <canvas ref={canvasRef} className="bs-canvas" style={{ display: status === 'detected' ? 'block' : 'none' }} />

          {status === 'scanning' && (
            <>
              <div className="bs-frame bs-frame-tl" />
              <div className="bs-frame bs-frame-tr" />
              <div className="bs-frame bs-frame-bl" />
              <div className="bs-frame bs-frame-br" />
              <div className="bs-scan-line" />
            </>
          )}

          {status === 'detected' && (
            <div className="bs-success-overlay">
              <div className="bs-check">✓</div>
            </div>
          )}

          {status === 'loading' && (
            <div className="bs-center-msg">
              <div className="bs-spinner" />
              <p>جاري تشغيل الكاميرا...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="bs-center-msg bs-error">
              <p>⚠️ تعذّر الوصول للكاميرا</p>
              <p style={{ fontSize: 13 }}>تأكد من إذن الكاميرا في المتصفح</p>
            </div>
          )}
        </div>

        <div className="bs-footer">
          {status === 'scanning' && (
            <p className="bs-hint">وجّه الكاميرا نحو الباركود — سيتم المسح تلقائياً</p>
          )}
          {status === 'detected' && (
            <p className="bs-hint bs-hint-success">✓ تم المسح: <strong>{detectedCode}</strong></p>
          )}
          {status === 'error' && (
            <p className="bs-hint bs-hint-error">لا يمكن المسح — استخدم الإدخال اليدوي</p>
          )}

          <div className="bs-actions">
            {torchTrackRef.current && (
              <button className={`bs-btn bs-btn-ghost ${torchOn ? 'active' : ''}`} onClick={toggleTorch} type="button">
                {torchOn ? '🔦 إطفاء الفلاش' : '🔦 تشغيل الفلاش'}
              </button>
            )}
            <button className="bs-btn bs-btn-cancel" onClick={onClose} type="button">إلغاء</button>
          </div>
        </div>
      </div>

      <style>{`
        .bs-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 15, 30, .72);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 1100;
          backdrop-filter: blur(4px);
        }

        .bs-modal {
          width: min(440px, 100%);
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(10,15,30,.22);
          border: 1px solid rgba(229,231,235,.9);
        }

        .bs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #eef2f7;
        }

        .bs-kicker {
          margin: 0 0 3px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #4361ee;
        }

        .bs-title {
          margin: 0;
          font-size: 20px;
          color: #172033;
        }

        .bs-close {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          font-size: 16px;
          color: #172033;
        }

        .bs-camera-wrap {
          position: relative;
          width: 100%;
          height: 300px;
          background: #0a0f1e;
          overflow: hidden;
        }

        .bs-video, .bs-canvas {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .bs-canvas {
          position: absolute;
          inset: 0;
        }

        /* Corner frames */
        .bs-frame {
          position: absolute;
          width: 28px;
          height: 28px;
          border-color: #fff;
          border-style: solid;
          z-index: 2;
        }
        .bs-frame-tl { top: 24px; left: 24px; border-width: 2px 0 0 2px; border-radius: 6px 0 0 0; }
        .bs-frame-tr { top: 24px; right: 24px; border-width: 2px 2px 0 0; border-radius: 0 6px 0 0; }
        .bs-frame-bl { bottom: 24px; left: 24px; border-width: 0 0 2px 2px; border-radius: 0 0 0 6px; }
        .bs-frame-br { bottom: 24px; right: 24px; border-width: 0 2px 2px 0; border-radius: 0 0 6px 0; }

        /* Scan line animation */
        .bs-scan-line {
          position: absolute;
          left: 10%;
          right: 10%;
          height: 2px;
          background: #4361ee;
          border-radius: 999px;
          box-shadow: 0 0 10px 2px rgba(67,97,238,.6);
          z-index: 2;
          animation: bsScanMove 2s ease-in-out infinite;
        }

        @keyframes bsScanMove {
          0%   { top: 20%; }
          50%  { top: 78%; }
          100% { top: 20%; }
        }

        /* Success overlay */
        .bs-success-overlay {
          position: absolute;
          inset: 0;
          background: rgba(16,185,129,.18);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
        }

        .bs-check {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #10b981;
          color: #fff;
          font-size: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: bsPop .25s cubic-bezier(.34,1.56,.64,1);
        }

        @keyframes bsPop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }

        /* Loading / error center */
        .bs-center-msg {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #fff;
          font-size: 14px;
          z-index: 3;
        }
        .bs-error { background: rgba(10,15,30,.5); }

        .bs-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(255,255,255,.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: bsSpin .8s linear infinite;
        }
        @keyframes bsSpin { to { transform: rotate(360deg); } }

        .bs-footer {
          padding: 14px 20px;
          border-top: 1px solid #eef2f7;
        }

        .bs-hint {
          margin: 0 0 12px;
          font-size: 13px;
          color: #6b7280;
          text-align: center;
        }

        .bs-hint-success { color: #059669; }
        .bs-hint-error   { color: #dc2626; }

        .bs-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .bs-btn {
          padding: 9px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          font-family: inherit;
        }

        .bs-btn-ghost {
          background: #f1f5f9;
          color: #334155;
        }
        .bs-btn-ghost.active {
          background: #fef3c7;
          color: #b45309;
        }

        .bs-btn-cancel {
          background: #fff;
          border: 1px solid #e5e7eb;
          color: #172033;
        }
      `}</style>
    </div>
  );
}
