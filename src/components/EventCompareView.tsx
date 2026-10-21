import React, { useMemo } from 'react';
import { LedgerEvent } from '../types/ledger';
import {
  ArrowLeftRight,
  GitCompare,
  X,
  Clock,
  UserCheck,
  MapPin,
  Lock,
  Layers,
  Flame,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Sparkles
} from 'lucide-react';

interface EventCompareViewProps {
  events: LedgerEvent[];
  compareSeqA: number;
  compareSeqB: number;
  onChangeSeqA: (seq: number) => void;
  onChangeSeqB: (seq: number) => void;
  onClose: () => void;
}

export const EventCompareView: React.FC<EventCompareViewProps> = ({
  events,
  compareSeqA,
  compareSeqB,
  onChangeSeqA,
  onChangeSeqB,
  onClose,
}) => {
  const eventA = events.find((e) => e.sequence === compareSeqA) || events[0];
  const eventB = events.find((e) => e.sequence === compareSeqB) || events[events.length - 1];

  const handleSwap = () => {
    const temp = compareSeqA;
    onChangeSeqA(compareSeqB);
    onChangeSeqB(temp);
  };

  // Calculate elapsed time
  const timeA = new Date(eventA.timestamp).getTime();
  const timeB = new Date(eventB.timestamp).getTime();
  const diffMs = Math.abs(timeB - timeA);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const elapsedStr = `${diffHours}h ${diffMinutes}m`;

  const isDirectParent = eventB.sequence === eventA.sequence + 1;
  const isDirectHashLinked = eventB.previousHash === eventA.hash;
  const isCustodyChanged = eventA.actor.organization !== eventB.actor.organization;
  const isLocationChanged = eventA.metadata.geo.locationName !== eventB.metadata.geo.locationName;

  // Deep compare payload keys
  const payloadDiff = useMemo(() => {
    const keysA = Object.keys(eventA.payload || {});
    const keysB = Object.keys(eventB.payload || {});
    const allKeys = Array.from(new Set([...keysA, ...keysB])).sort();

    return allKeys.map((key) => {
      const valA = eventA.payload?.[key];
      const valB = eventB.payload?.[key];

      const existsA = key in (eventA.payload || {});
      const existsB = key in (eventB.payload || {});

      const strA = existsA ? JSON.stringify(valA) : undefined;
      const strB = existsB ? JSON.stringify(valB) : undefined;

      let status: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
      if (!existsA && existsB) status = 'ADDED';
      else if (existsA && !existsB) status = 'REMOVED';
      else if (strA !== strB) status = 'MODIFIED';
      else status = 'UNCHANGED';

      return {
        key,
        valA,
        valB,
        strA: strA ? (strA.length > 60 ? strA.slice(0, 60) + '...' : strA) : '—',
        strB: strB ? (strB.length > 60 ? strB.slice(0, 60) + '...' : strB) : '—',
        status,
      };
    });
  }, [eventA, eventB]);

  return (
    <div className="bg-slate-950 border-2 border-indigo-500/60 rounded-2xl p-5 shadow-2xl space-y-5 animate-in fade-in duration-200">
      {/* Top Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <GitCompare className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Side-by-Side State Transition Inspector
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold uppercase">
              Delta Diff
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare payload and metadata transitions between any two events in the immutable event log.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Presets */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-500 px-1.5">Presets:</span>
            {events.length >= 8 && (
              <button
                onClick={() => {
                  onChangeSeqA(7);
                  onChangeSeqB(8);
                }}
                className="px-2 py-0.5 rounded hover:bg-slate-800 text-amber-300 transition-colors"
                title="Compare Pre-Spike (#7) vs Critical Excursion (#8)"
              >
                Pre vs Post Spike (#7 vs #8)
              </button>
            )}
            <button
              onClick={() => {
                onChangeSeqA(1);
                onChangeSeqB(events.length);
              }}
              className="px-2 py-0.5 rounded hover:bg-slate-800 text-indigo-300 transition-colors"
              title="Compare Genesis Event vs Tail Head Event"
            >
              Genesis vs Head (#1 vs #{events.length})
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ml-1"
            title="Close Comparison View"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
        {/* Selector Event A */}
        <div className="md:col-span-5 space-y-1">
          <label className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
            Baseline Event A (Sequence #{eventA.sequence})
          </label>
          <select
            value={compareSeqA}
            onChange={(e) => onChangeSeqA(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-indigo-500"
          >
            {events.map((e) => (
              <option key={e.sequence} value={e.sequence}>
                #{e.sequence}: {e.eventType} — {new Date(e.timestamp).toLocaleTimeString()} ({e.actor.organization.slice(0, 16)})
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button & Delta Info */}
        <div className="md:col-span-1 flex flex-col items-center justify-center">
          <button
            onClick={handleSwap}
            className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all shadow active:scale-95"
            title="Swap Event A and Event B"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Selector Event B */}
        <div className="md:col-span-5 space-y-1">
          <label className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
            Target Transition Event B (Sequence #{eventB.sequence})
          </label>
          <select
            value={compareSeqB}
            onChange={(e) => onChangeSeqB(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:ring-1 focus:ring-indigo-500"
          >
            {events.map((e) => (
              <option key={e.sequence} value={e.sequence}>
                #{e.sequence}: {e.eventType} — {new Date(e.timestamp).toLocaleTimeString()} ({e.actor.organization.slice(0, 16)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transition Summary Badges */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          Elapsed Time: <strong className="text-white">{elapsedStr}</strong>
        </span>

        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          Sequence Delta: <strong className="text-white">{eventB.sequence - eventA.sequence} events</strong>
        </span>

        {isDirectParent ? (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Direct Successor (Hash-Linked)
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            Multi-Hop Ancestor ({Math.abs(eventB.sequence - eventA.sequence)} steps apart)
          </span>
        )}

        {isCustodyChanged && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-300">
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            Custody Handover Occurred
          </span>
        )}

        {isLocationChanged && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-300">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            Geographic Relocation
          </span>
        )}
      </div>

      {/* Side-by-Side Dual Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column A */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                #{eventA.sequence}
              </span>
              <span className="text-sm font-bold text-white font-mono">{eventA.eventType}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {new Date(eventA.timestamp).toUTCString().slice(0, 22)}
            </span>
          </div>

          {/* Actor Card */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">Actor &amp; Organization</div>
            <div className="text-white font-bold">{eventA.actor.organization}</div>
            <div className="text-slate-400 text-[11px]">{eventA.actor.name} ({eventA.actor.role})</div>
            <div className="text-[10px] text-slate-500 truncate">Key: {eventA.actor.publicKey}</div>
          </div>

          {/* Location & Metadata */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">Location &amp; Hardware Sensor</div>
            <div className="text-slate-200 font-semibold">{eventA.metadata.geo.locationName}</div>
            <div className="text-slate-400 text-[11px]">
              Coord: ({eventA.metadata.geo.lat.toFixed(2)}, {eventA.metadata.geo.lng.toFixed(2)}) • Device: {eventA.metadata.deviceId}
            </div>
            {eventA.metadata.notes && (
              <div className="text-[11px] text-indigo-300/80 italic pt-1 border-t border-slate-900">
                &ldquo;{eventA.metadata.notes}&rdquo;
              </div>
            )}
          </div>

          {/* Cryptographic Hashes */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono space-y-1">
            <div className="text-[10px] text-slate-500 uppercase">Cryptographic Signatures</div>
            <div className="text-slate-400 truncate">
              PrevHash: <span className="text-slate-300">{eventA.previousHash.slice(0, 16)}...</span>
            </div>
            <div className="text-slate-400 truncate">
              Hash: <span className="text-indigo-400 font-bold">{eventA.hash.slice(0, 16)}...</span>
            </div>
          </div>
        </div>

        {/* Column B */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                #{eventB.sequence}
              </span>
              <span className="text-sm font-bold text-white font-mono">{eventB.eventType}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {new Date(eventB.timestamp).toUTCString().slice(0, 22)}
            </span>
          </div>

          {/* Actor Card */}
          <div className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 ${
            isCustodyChanged ? 'bg-purple-950/40 border-purple-800' : 'bg-slate-950/80 border-slate-800/80'
          }`}>
            <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
              <span>Actor &amp; Organization</span>
              {isCustodyChanged && <span className="text-purple-400 font-bold">NEW CUSTODIAN</span>}
            </div>
            <div className="text-white font-bold">{eventB.actor.organization}</div>
            <div className="text-slate-400 text-[11px]">{eventB.actor.name} ({eventB.actor.role})</div>
            <div className="text-[10px] text-slate-500 truncate">Key: {eventB.actor.publicKey}</div>
          </div>

          {/* Location & Metadata */}
          <div className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 ${
            isLocationChanged ? 'bg-cyan-950/40 border-cyan-800' : 'bg-slate-950/80 border-slate-800/80'
          }`}>
            <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
              <span>Location &amp; Hardware Sensor</span>
              {isLocationChanged && <span className="text-cyan-400 font-bold">NEW LOCATION</span>}
            </div>
            <div className="text-slate-200 font-semibold">{eventB.metadata.geo.locationName}</div>
            <div className="text-slate-400 text-[11px]">
              Coord: ({eventB.metadata.geo.lat.toFixed(2)}, {eventB.metadata.geo.lng.toFixed(2)}) • Device: {eventB.metadata.deviceId}
            </div>
            {eventB.metadata.notes && (
              <div className="text-[11px] text-cyan-300/80 italic pt-1 border-t border-slate-900">
                &ldquo;{eventB.metadata.notes}&rdquo;
              </div>
            )}
          </div>

          {/* Cryptographic Hashes */}
          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono space-y-1">
            <div className="text-[10px] text-slate-500 uppercase flex items-center justify-between">
              <span>Cryptographic Signatures</span>
              {isDirectHashLinked && (
                <span className="text-emerald-400 font-bold">CHAINDIGEST MATCH</span>
              )}
            </div>
            <div className="text-slate-400 truncate">
              PrevHash:{' '}
              <span className={isDirectHashLinked ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                {eventB.previousHash.slice(0, 16)}...
              </span>
            </div>
            <div className="text-slate-400 truncate">
              Hash: <span className="text-cyan-400 font-bold">{eventB.hash.slice(0, 16)}...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payload Field-by-Field Delta Diff Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileCode2 className="w-4 h-4 text-indigo-400" />
            Payload Transition Delta Diff
          </h4>
          <span className="text-[11px] font-mono text-slate-500">
            {payloadDiff.filter((d) => d.status !== 'UNCHANGED').length} field differences detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
              <tr>
                <th className="p-2 w-1/4">Field Key</th>
                <th className="p-2 w-1/3">Event A Value (#{eventA.sequence})</th>
                <th className="p-2 w-1/3">Event B Value (#{eventB.sequence})</th>
                <th className="p-2 w-24 text-right">Delta State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {payloadDiff.map((diff) => (
                <tr
                  key={diff.key}
                  className={`transition-colors ${
                    diff.status === 'MODIFIED'
                      ? 'bg-amber-950/20 hover:bg-amber-950/30'
                      : diff.status === 'ADDED'
                      ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                      : diff.status === 'REMOVED'
                      ? 'bg-red-950/20 hover:bg-red-950/30'
                      : 'hover:bg-slate-950/40'
                  }`}
                >
                  <td className="p-2 font-bold text-white flex items-center gap-1.5">
                    {diff.status === 'MODIFIED' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    )}
                    {diff.status === 'ADDED' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    )}
                    {diff.status === 'REMOVED' && (
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    )}
                    <span>{diff.key}</span>
                  </td>
                  <td className="p-2 text-slate-400 break-all">{diff.strA}</td>
                  <td className="p-2 text-white font-medium break-all">{diff.strB}</td>
                  <td className="p-2 text-right">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        diff.status === 'MODIFIED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : diff.status === 'ADDED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : diff.status === 'REMOVED'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {diff.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
