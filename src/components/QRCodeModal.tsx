import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AggregateState } from '../types/ledger';
import {
  QrCode,
  X,
  Download,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  ExternalLink,
  Layers,
  Thermometer,
  Lock,
  UserCheck
} from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateId: string;
  latestHash: string;
  sequence: number;
  state: AggregateState | null;
  isChainValid: boolean;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  aggregateId,
  latestHash,
  sequence,
  state,
  isChainValid,
}) => {
  const [encodingMode, setEncodingMode] = useState<'url' | 'json'>('url');
  const [copied, setCopied] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Build verification URL that inspectors scan
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const verificationUrl = `${baseUrl}/?verify=${encodeURIComponent(aggregateId)}&hash=${encodeURIComponent(latestHash)}&seq=${sequence}`;

  // Build raw JSON payload for automated RFID / handheld industrial scanners
  const jsonPayload = JSON.stringify(
    {
      system: 'AuditTrail-Ledger',
      aggregateId,
      headHash: latestHash,
      sequence,
      custodian: state?.currentCustodian?.organization || 'Unknown',
      seal: state?.sealInfo?.sealNumber || 'UNKNOWN',
      currentTemp: state?.telemetry?.currentTemperature ?? null,
      verificationUrl,
      timestamp: new Date().toISOString(),
    },
    null,
    2
  );

  const qrValue = encodingMode === 'url' ? verificationUrl : jsonPayload;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    if (!qrRef.current) return;
    const svgEl = qrRef.current.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `QR-Inspector-Pass-${aggregateId}-Seq${sequence}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const handlePrintPlacard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Mobile Inspector QR Placard</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    isChainValid
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {isChainValid ? 'Chain Intact' : 'Tamper Alert'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical container door barcode &amp; mobile handheld verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Encoding Format Selector */}
        <div className="flex items-center justify-between mt-4 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setEncodingMode('url')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
              encodingMode === 'url'
                ? 'bg-indigo-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mobile Camera Verification URL
          </button>
          <button
            onClick={() => setEncodingMode('json')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all ${
              encodingMode === 'json'
                ? 'bg-indigo-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Cryptographic JSON Digest
          </button>
        </div>

        {/* QR Code Presentation Box */}
        <div className="my-5 flex flex-col items-center">
          <div
            ref={qrRef}
            className="bg-white p-5 rounded-2xl shadow-2xl border-4 border-indigo-600/30 flex flex-col items-center relative group"
          >
            <QRCodeSVG
              value={qrValue}
              size={210}
              level="H"
              includeMargin={false}
              fgColor="#090d16"
              bgColor="#ffffff"
            />
            {/* Center Label Badge */}
            <div className="mt-3 text-center">
              <div className="text-[11px] font-mono font-black text-slate-900 tracking-wider">
                {aggregateId}
              </div>
              <div className="text-[9px] font-mono text-slate-600">
                HEAD: {latestHash.slice(0, 12)}...
              </div>
            </div>
          </div>

          <div className="mt-3 text-center">
            <span className="text-xs text-slate-300 font-medium">
              Scan with any mobile phone camera or handheld customs reader
            </span>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Sequence #{sequence} • SHA-256 Digest Anchor
            </div>
          </div>
        </div>

        {/* Encoded Content Inspector */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Encoded Payload Data ({encodingMode.toUpperCase()})
            </span>
            <button
              onClick={handleCopy}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="text-slate-300 text-[11px] break-all bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 max-h-24 overflow-y-auto">
            {qrValue}
          </div>
        </div>

        {/* Quick Simulated Field Inspector View */}
        {showMobilePreview && state && (
          <div className="mt-4 p-4 bg-indigo-950/40 border border-indigo-800/80 rounded-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-indigo-900/60 pb-2">
              <span className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5 uppercase">
                <Smartphone className="w-4 h-4 text-cyan-400" /> Simulated Mobile Inspector Device Screen
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                LIVE VERIFICATION OK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-[10px] text-slate-500 block">CONTAINER ID</span>
                <span className="text-white font-bold">{aggregateId}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-[10px] text-slate-500 block">SEAL NUMBER</span>
                <span className="text-amber-300 font-bold">{state.sealInfo.sealNumber}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-[10px] text-slate-500 block">RECORDED TEMP</span>
                <span className="text-emerald-400 font-bold">{state.telemetry.currentTemperature.toFixed(1)}°C</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-[10px] text-slate-500 block">CURRENT CUSTODIAN</span>
                <span className="text-indigo-300 truncate block">{state.currentCustodian.organization}</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800 flex items-center justify-between">
              <span>Cryptographic Head: {latestHash.slice(0, 16)}...</span>
              <span className="text-emerald-400 font-bold">100% MATCH</span>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showMobilePreview ? 'Hide Field Simulator' : 'Simulate Inspector Scan'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSVG}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download SVG</span>
            </button>
            <button
              onClick={handlePrintPlacard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Placard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
