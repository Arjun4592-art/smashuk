'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}
const HINTS = new Map();
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128]);
export default function CameraBarcodeScanner({
  onDetected,
  onClose
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const firedRef = useRef(false);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'denied' | 'error'>('starting');
  const [manualCode, setManualCode] = useState('');
  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader(HINTS);
    async function start() {
      try {
        const controls = await reader.decodeFromConstraints({
          video: {
            facingMode: 'environment'
          }
        }, videoRef.current!, result => {
          if (result && !firedRef.current && !cancelled) {
            firedRef.current = true;
            onDetected(result.getText());
            controlsRef.current?.stop();
          }
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus('scanning');
      } catch (err: any) {
        console.error('[CameraBarcodeScanner] start failed:', err);
        setStatus(err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' ? 'denied' : 'error');
      }
    }
    start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, []);
  const handleManualSubmit = () => {
    const v = manualCode.trim();
    if (!v) return;
    onDetected(v);
  };
  return <div className='fixed inset-0 flex items-center justify-center z-50 p-4' style={{
    background: 'rgba(0,0,0,0.6)'
  }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className='w-full max-w-sm rounded-xl overflow-hidden' style={{
      background: '#FFFFFF',
      border: '1px solid #E1E3E5',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
    }}>
        {}
        <div className='flex items-center justify-between px-5 py-4' style={{
        borderBottom: '1px solid #E1E3E5'
      }}>
          <h3 className='text-base font-semibold' style={{
          color: '#202223'
        }}>
            Scan barcode
          </h3>
          <button onClick={onClose} className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F6F6F7]' style={{
          color: '#6D7175'
        }}>
            <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        <div className='p-5 space-y-4'>
          {}
          <div className='relative rounded-lg overflow-hidden' style={{
          background: '#000',
          aspectRatio: '4 / 3'
        }}>
            <video ref={videoRef} muted playsInline className='w-full h-full object-cover' />
            {(status === 'starting' || status === 'scanning') && <>
                <div className='absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5' style={{
              background: 'rgba(0,128,96,0.8)'
            }} />
                <div className='absolute inset-6 rounded-lg pointer-events-none' style={{
              border: '2px solid rgba(255,255,255,0.5)'
            }} />
              </>}
            {status === 'starting' && <div className='absolute inset-0 flex items-center justify-center text-sm' style={{
            color: '#FFFFFF'
          }}>
                Starting camera…
              </div>}
          </div>

          {status === 'scanning' && <p className='text-xs text-center' style={{
          color: '#6D7175'
        }}>
              Point the camera at a barcode — it adds to the cart automatically
              once found.
            </p>}

          {}
          {(status === 'denied' || status === 'error') && <div className='space-y-3'>
              <div className='px-3 py-2.5 rounded-lg text-xs' style={{
            background: '#FFFBEB',
            color: '#B7791F'
          }}>
                {status === 'denied' ? 'Camera access was denied — allow it in your browser settings, or type the barcode/SKU below.' : "Couldn't start the camera on this device — type the barcode/SKU below instead."}
              </div>
              <div>
                <label className='text-[11px] font-medium uppercase tracking-wide block mb-1.5' style={{
              color: '#6D7175'
            }}>
                  Barcode / SKU
                </label>
                <div className='flex items-center gap-2 px-3 py-2.5 rounded-lg border' style={{
              borderColor: '#E1E3E5'
            }}>
                  <input autoFocus value={manualCode} onChange={e => setManualCode(e.target.value)} onKeyDown={e => {
                if (e.key === 'Enter') handleManualSubmit();
              }} placeholder='Type or paste the code' className='flex-1 bg-transparent outline-none text-sm' style={{
                color: '#202223'
              }} />
                </div>
              </div>
            </div>}
        </div>

        {}
        <div className='px-5 pb-5 flex gap-2'>
          <button onClick={onClose} className='flex-1 py-2.5 rounded-lg text-sm border transition-colors hover:bg-[#F6F6F7]' style={{
          borderColor: '#E1E3E5',
          color: '#6D7175'
        }}>
            Cancel
          </button>
          {(status === 'denied' || status === 'error') && <button onClick={handleManualSubmit} disabled={!manualCode.trim()} className='py-2.5 px-6 rounded-lg text-sm font-semibold transition-colors' style={{
          background: manualCode.trim() ? '#008060' : '#E1E3E5',
          color: manualCode.trim() ? '#FFFFFF' : '#8C9196',
          flex: 2,
          cursor: manualCode.trim() ? 'pointer' : 'not-allowed'
        }}>
              Add
            </button>}
        </div>
      </div>
    </div>;
}
