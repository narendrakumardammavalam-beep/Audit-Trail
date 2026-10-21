import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  History,
  Send,
  FileCheck2,
  RotateCcw,
  Plus,
  Radio,
  Cpu,
  QrCode
} from 'lucide-react';
import { LedgerVerificationResult } from '../types/ledger';

interface HeaderProps {
  aggregates: Array<{
    aggregateId: string;
    title: string;
    eventsCount: number;
    status: string;
    hasDispute: boolean;
    tampered: boolean;
  }>;
  selectedAggregateId: string;
  onSelectAggregate: (id: string) => void;
  verification: LedgerVerificationResult | null;
  onOpenCommandModal: () => void;
  onOpenTamperModal: () => void;
  onOpenAuditProofModal: () => void;
  onOpenNewContainerModal: () => void;
  onOpenQRModal: () => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  aggregates,
  selectedAggregateId,
  onSelectAggregate,
  verification,
  onOpenCommandModal,
  onOpenTamperModal,
  onOpenAuditProofModal,
  onOpenNewContainerModal,
  onOpenQRModal,
  onResetDemo,
  isResetting,
}) => {
  const isChainValid = verification?.isValid ?? true;

  return (
    <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & CQRS Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
                <History className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  AuditTrail
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 uppercase font-semibold">
                  CQRS Event Store
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Immutable Ledger • Mathematical State Folds • Cryptographic Proofs
              </p>
            </div>
          </div>

          {/* Aggregate Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedAggregateId}
                onChange={(e) => onSelectAggregate(e.target.value)}
                className="bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono cursor-pointer"
              >
                {aggregates.map((agg) => (
                  <option key={agg.aggregateId} value={agg.aggregateId}>
                    {agg.aggregateId} — {agg.title.slice(0, 32)}... ({agg.eventsCount} evts)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenNewContainerModal}
              title="Initialize New Aggregate Container"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center text-xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline ml-1 font-medium">New</span>
            </button>
          </div>

          {/* Actions & Verification Status */}
          <div className="flex items-center gap-2">
            {/* Cryptographic Chain Status Badge */}
            <button
              onClick={onOpenTamperModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
                isChainValid
                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/80 hover:bg-emerald-950/80 shadow-sm shadow-emerald-950'
                  : 'bg-red-950/80 text-red-300 border-red-700 animate-pulse hover:bg-red-950'
              }`}
              title="Click to inspect cryptographic SHA-256 chain and run tamper tests"
            >
              {isChainValid ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">100% Chain Valid</span>
                  <span className="sm:hidden">Valid</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span className="hidden sm:inline">Tamper Detected!</span>
                  <span className="sm:hidden">Broken</span>
                </>
              )}
            </button>

            {/* Dispatch Command Button */}
            <button
              onClick={onOpenCommandModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs sm:text-sm font-medium transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dispatch Command</span>
              <span className="md:hidden">Command</span>
            </button>

            {/* Inspector QR Code Button */}
            <button
              onClick={onOpenQRModal}
              title="Generate Mobile Inspector QR Code (Encodes Container ID & Head Hash)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">QR Pass</span>
            </button>

            {/* Audit Certificate Export */}
            <button
              onClick={onOpenAuditProofModal}
              title="Export Cryptographic Audit Proof & Chain Certificate"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline">Audit Proof</span>
            </button>

            {/* Reset Seed Demo */}
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              title="Reset Ledgers to Initial State"
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
