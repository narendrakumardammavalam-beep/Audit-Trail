import React, { useState } from 'react';
import { LedgerEvent, LedgerVerificationResult } from '../types/ledger';
import {
  ShieldAlert,
  ShieldCheck,
  Bug,
  RotateCcw,
  X,
  AlertTriangle,
  ArrowRight,
  Database,
  Hash,
  Lock,
  Layers
} from 'lucide-react';

interface TamperModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateId: string;
  events: LedgerEvent[];
  verification: LedgerVerificationResult | null;
  targetSequence?: number;
  onTamperSimulated: () => void;
  onRestoreSuccess: () => void;
}

export const TamperModal: React.FC<TamperModalProps> = ({
  isOpen,
  onClose,
  aggregateId,
  events,
  verification,
  targetSequence = 8,
  onTamperSimulated,
  onRestoreSuccess,
}) => {
  const [selectedSeq, setSelectedSeq] = useState<number>(targetSequence);
  const [alteredField, setAlteredField] = useState('temperature');
  const [maliciousValue, setMaliciousValue] = useState('-18.5');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const targetEvent = events.find((e) => e.sequence === selectedSeq) || events[0];
  const isChainValid = verification?.isValid ?? true;

  const handleTamper = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/commands/tamper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateId,
          targetSequence: selectedSeq,
          alteredField,
          maliciousValue: parseFloat(maliciousValue) || maliciousValue,
        }),
      });
      onTamperSimulated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/commands/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aggregateId }),
      });
      onRestoreSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isChainValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400 animate-pulse'
              }`}
            >
              {isChainValid ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Cryptographic Forensic Integrity Lab</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    isChainValid
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {isChainValid ? 'Chain 100% Intact' : 'Tamper Detected!'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Demonstrating why CRUD fails in regulated logistics and how Event Sourcing guarantees immutable proof.
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

        {/* Conceptual Contrast: CRUD vs Event Sourcing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-red-400 mb-1">
              <Database className="w-3.5 h-3.5" /> Traditional MongoDB (CRUD)
            </div>
            <p className="text-slate-400 leading-relaxed">
              When updating inventory or sensor state (<code className="text-slate-300 font-mono">$set: &#123; temp: -18 &#125;</code>), the previous record (-4.2°C spike) is <strong>overwritten and destroyed forever</strong>. Malicious actors or errors leave zero audit proof for regulators or maritime courts.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-indigo-900/60 rounded-xl p-3.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-300 mb-1">
              <Layers className="w-3.5 h-3.5" /> Event Sourcing + SHA-256 Chain
            </div>
            <p className="text-slate-400 leading-relaxed">
              State is never mutated. Every event is sealed with <code className="text-indigo-300 font-mono">SHA256(prevHash + payload)</code>. If a corrupt party modifies a past database record, the entire mathematical hash chain immediately breaks, proving fraud.
            </p>
          </div>
        </div>

        {/* Verification Alert Banner */}
        {!isChainValid && (
          <div className="p-4 bg-red-950/80 border border-red-700 rounded-xl my-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>CRYPTOGRAPHIC FORGERY DETECTED AT SEQUENCE #{verification?.brokenLinkIndex}</span>
            </div>
            <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
              {verification?.verificationMessage}
            </p>
            <div className="bg-slate-950 p-2 rounded border border-red-900 font-mono text-[10px] space-y-1">
              <div className="text-slate-400 truncate">
                Expected Hash: <span className="text-emerald-400">{verification?.expectedHash}</span>
              </div>
              <div className="text-slate-400 truncate">
                Recomputed Hash: <span className="text-red-400">{verification?.actualHash}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tamper Simulator Controls */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 my-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <Bug className="w-4 h-4" /> Simulate Rogue Carrier Database Alteration
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              (Bypassing write API, directly editing database)
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Suppose the carrier secretly alters Event #{selectedSeq} to hide that the temperature spiked to -4.2°C, changing it to a compliant -18.5°C:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Event Seq</label>
              <select
                value={selectedSeq}
                onChange={(e) => setSelectedSeq(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              >
                {events.map((e) => (
                  <option key={e.sequence} value={e.sequence}>
                    #{e.sequence}: {e.eventType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Field to Alter</label>
              <input
                type="text"
                value={alteredField}
                onChange={(e) => setAlteredField(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Forged Value</label>
              <input
                type="text"
                value={maliciousValue}
                onChange={(e) => setMaliciousValue(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          {targetEvent && (
            <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300">
              <span>Original Payload Field: <strong className="text-white">{targetEvent.payload[alteredField] ?? 'undefined'}</strong></span>
              <span>Event Hash: {targetEvent.hash.slice(0, 12)}...</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTamper}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Simulate Malicious DB Edit</span>
            </button>

            <button
              onClick={handleRestore}
              disabled={isLoading || isChainValid}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Verified Truth</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Close Laboratory
          </button>
        </div>
      </div>
    </div>
  );
};
