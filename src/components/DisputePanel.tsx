import React, { useState } from 'react';
import { DisputeRecord, LedgerEvent, AggregateState } from '../types/ledger';
import {
  Scale,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  Building2,
  Calendar,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  HelpCircle
} from 'lucide-react';

interface DisputePanelProps {
  disputes: DisputeRecord[];
  events: LedgerEvent[];
  state: AggregateState;
  onResolveDispute: (disputeId: string, resolution: string) => void;
  onJumpToEvent: (sequence: number) => void;
}

export const DisputePanel: React.FC<DisputePanelProps> = ({
  disputes,
  events,
  state,
  onResolveDispute,
  onJumpToEvent,
}) => {
  const [resolutionText, setResolutionText] = useState('');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  if (disputes.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
        <Scale className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <h4 className="text-base font-bold text-white">No Active Commercial Disputes</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          All chain of custody handoffs and telemetry invariants have passed without formal liability claims.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Forensic Dispute Resolution & Liability Attribution
            </h3>
            <span className="text-xs font-mono bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-bold">
              {disputes.filter((d) => d.status === 'OPEN').length} Open Claims
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Using immutable event logs and cryptographic proof of sequence to resolve cold-chain spillage liability.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {disputes.map((dispute) => {
          const culpritEvent = dispute.culpritEventSequence
            ? events.find((e) => e.sequence === dispute.culpritEventSequence)
            : null;

          return (
            <div
              key={dispute.id}
              className="bg-slate-950/80 border border-rose-900/50 rounded-xl p-4 shadow-lg"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                      {dispute.id}
                    </span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                        dispute.status === 'OPEN'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {dispute.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Filed: {new Date(dispute.openedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1.5">{dispute.reason}</h4>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">Claim Amount</div>
                  <div className="text-xl font-bold font-mono text-rose-400">
                    ${dispute.claimAmountUSD.toLocaleString()} USD
                  </div>
                </div>
              </div>

              {/* Claimant vs Respondent */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Claimant (Loss Incurred)</div>
                  <div className="font-semibold text-white text-sm mt-0.5">{dispute.claimant}</div>
                  <div className="text-xs text-slate-400 mt-1">Demands full indemnification for degraded oncology batch</div>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Respondent (Alleged Carrier at Fault)</div>
                  <div className="font-semibold text-white text-sm mt-0.5">{dispute.respondent}</div>
                  <div className="text-xs text-slate-400 mt-1">Carrier holding physical custody during recorded anomaly</div>
                </div>
              </div>

              {/* Forensic Evidence Breakdown */}
              {culpritEvent && (
                <div className="bg-slate-900/90 border border-amber-900/40 rounded-xl p-3.5 my-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5 uppercase">
                      <ShieldAlert className="w-4 h-4 text-amber-400" /> Irrefutable Forensic Evidence (Event #{culpritEvent.sequence})
                    </span>
                    <button
                      onClick={() => onJumpToEvent(culpritEvent.sequence)}
                      className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <span>Jump to Event #{culpritEvent.sequence}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">TIMESTAMP</span>
                      {new Date(culpritEvent.timestamp).toUTCString()}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">CUSTODIAN SIGNATURE</span>
                      {culpritEvent.actor.organization}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">LOCATION</span>
                      {culpritEvent.metadata.geo.locationName}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <span>
                      <strong className="text-red-400 font-mono">{culpritEvent.payload.temperature}°C</strong> recorded during power blackout (duration: {culpritEvent.payload.durationMinutes}m).
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Digest: {culpritEvent.hash.slice(0, 12)}...
                    </span>
                  </div>
                </div>
              )}

              {/* Settlement Section */}
              {dispute.status === 'OPEN' ? (
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    Based on immutable cryptographic proof, Pacific & Atlantic SeaLines accepts liability for $420,000 USD.
                  </div>
                  <button
                    onClick={() => {
                      const note = prompt(
                        'Enter dispute settlement terms & legal arbitration decree:',
                        'Carrier insurance paid $420,000 full settlement. Event chain accepted by Rotterdam Maritime Court.'
                      );
                      if (note) onResolveDispute(dispute.id, note);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 shrink-0"
                  >
                    Resolve & Execute Settlement
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-800/80 text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>SETTLED: {dispute.resolution}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
