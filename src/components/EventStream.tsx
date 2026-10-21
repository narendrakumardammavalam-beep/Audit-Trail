import React, { useState } from 'react';
import { LedgerEvent } from '../types/ledger';
import {
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  Key,
  Flame,
  ShieldCheck,
  UserCheck,
  Package,
  Anchor,
  Truck,
  Plane,
  FileText,
  Lock,
  Layers,
  Bug,
  Search,
  Filter,
  X,
  GitCompare,
  ArrowLeftRight
} from 'lucide-react';
import { EventCompareView } from './EventCompareView';

interface EventStreamProps {
  events: LedgerEvent[];
  selectedSequence: number;
  onSelectSequence: (sequence: number) => void;
  onOpenTamperTarget: (sequence: number) => void;
}

export const EventStream: React.FC<EventStreamProps> = ({
  events,
  selectedSequence,
  onSelectSequence,
  onOpenTamperTarget,
}) => {
  const [expandedEvents, setExpandedEvents] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('ALL');

  // Side-by-side comparison state
  const [showCompareView, setShowCompareView] = useState(false);
  const [compareSeqA, setCompareSeqA] = useState<number>(1);
  const [compareSeqB, setCompareSeqB] = useState<number>(events.length > 1 ? events.length : 1);

  const toggleExpand = (seq: number) => {
    setExpandedEvents((prev) => ({ ...prev, [seq]: !prev[seq] }));
  };

  // Extract distinct event types
  const distinctEventTypes = Array.from(new Set(events.map((e) => e.eventType))).sort();

  // Filter events by type, actor name/org/role, and metadata/payload keywords
  const filteredEvents = events.filter((evt) => {
    if (selectedEventType !== 'ALL' && evt.eventType !== selectedEventType) {
      return false;
    }

    if (!searchQuery.trim()) return true;

    const query = searchQuery.trim().toLowerCase();

    // Match sequence number (e.g. "8" or "#8")
    if (evt.sequence.toString() === query || `#${evt.sequence}` === query) {
      return true;
    }

    // Match event type
    if (
      evt.eventType.toLowerCase().includes(query) ||
      evt.eventType.replace(/_/g, ' ').toLowerCase().includes(query)
    ) {
      return true;
    }

    // Match actor name, organization, role, public key, or ID
    if (
      evt.actor.name.toLowerCase().includes(query) ||
      evt.actor.organization.toLowerCase().includes(query) ||
      evt.actor.role.toLowerCase().includes(query) ||
      evt.actor.publicKey.toLowerCase().includes(query) ||
      evt.actor.id.toLowerCase().includes(query)
    ) {
      return true;
    }

    // Match metadata (location name, device ID, sensor model, notes, ip)
    if (
      evt.metadata.geo.locationName.toLowerCase().includes(query) ||
      (evt.metadata.deviceId && evt.metadata.deviceId.toLowerCase().includes(query)) ||
      (evt.metadata.sensorModel && evt.metadata.sensorModel.toLowerCase().includes(query)) ||
      (evt.metadata.notes && evt.metadata.notes.toLowerCase().includes(query)) ||
      (evt.metadata.ip && evt.metadata.ip.toLowerCase().includes(query))
    ) {
      return true;
    }

    // Match payload values / keys
    if (JSON.stringify(evt.payload).toLowerCase().includes(query)) {
      return true;
    }

    // Match hash snippets
    if (evt.hash.toLowerCase().includes(query) || evt.previousHash.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CONTAINER_CREATED':
        return <Package className="w-4 h-4 text-indigo-400" />;
      case 'SEAL_AFFIXED':
        return <Lock className="w-4 h-4 text-amber-400" />;
      case 'INVENTORY_LOADED':
        return <Package className="w-4 h-4 text-blue-400" />;
      case 'LOADED_ON_VESSEL':
        return <Anchor className="w-4 h-4 text-cyan-400" />;
      case 'VESSEL_DEPARTED':
        return <Truck className="w-4 h-4 text-sky-400" />;
      case 'TEMPERATURE_LOGGED':
        return <Layers className="w-4 h-4 text-teal-400" />;
      case 'TEMPERATURE_SPIKE':
        return <Flame className="w-4 h-4 text-red-400" />;
      case 'REEFER_POWER_RESTORED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'CUSTODY_TRANSFERRED':
        return <UserCheck className="w-4 h-4 text-purple-400" />;
      case 'PORT_CHECKPOINT_CLEARED':
      case 'CUSTOMS_INSPECTED':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'DISPUTE_FILED':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'DISPUTE_RESOLVED':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-indigo-400" /> Append-Only Immutable Event Store
            </h3>
            <span className="text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
              {events.length} Events Logged
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Raw immutable ledger entries chained with SHA-256 cryptographic signatures. No data is ever overwritten.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!showCompareView) {
                const targetB = selectedSequence;
                const targetA = selectedSequence > 1 ? selectedSequence - 1 : 1;
                setCompareSeqA(targetA);
                setCompareSeqB(targetB);
              }
              setShowCompareView(!showCompareView);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer ${
              showCompareView
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-indigo-400" />
            <span>{showCompareView ? 'Close Comparison' : 'Side-by-Side Diff'}</span>
          </button>

          <div className="text-xs text-slate-400 font-mono hidden sm:flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>Genesis Hash: 00000000...0000</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Event Comparison View */}
      {showCompareView && (
        <div className="mb-6">
          <EventCompareView
            events={events}
            compareSeqA={compareSeqA}
            compareSeqB={compareSeqB}
            onChangeSeqA={setCompareSeqA}
            onChangeSeqB={setCompareSeqB}
            onClose={() => setShowCompareView(false)}
          />
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-3 bg-slate-950/80 p-3.5 sm:p-4 rounded-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event type, actor name, organization, or metadata keyword..."
              className="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Event Type Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400 shrink-0 hidden sm:block" />
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono cursor-pointer"
            >
              <option value="ALL">All Event Types ({events.length})</option>
              {distinctEventTypes.map((type) => (
                <option key={type} value={type}>
                  {type} ({events.filter((e) => e.eventType === type).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary & Quick Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-slate-900">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span>Showing:</span>
            <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {filteredEvents.length} of {events.length} events
            </span>
            {(searchQuery || selectedEventType !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedEventType('ALL');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline ml-1 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Quick Filter Tag Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <span className="text-slate-500 mr-1 hidden md:inline">Quick Filters:</span>
            {['TEMPERATURE_SPIKE', 'CUSTODY_TRANSFERRED', 'SEAL_AFFIXED', 'DISPUTE_FILED'].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedEventType === tag) setSelectedEventType('ALL');
                  else setSelectedEventType(tag);
                }}
                className={`px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  selectedEventType === tag
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {tag.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Timeline List */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-sm font-semibold text-slate-300">
            No events match your search &ldquo;{searchQuery || selectedEventType}&rdquo;
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try searching by actor name (e.g. &ldquo;Evelyn Vance&rdquo;), location (e.g. &ldquo;Rotterdam&rdquo;), or clear your event type filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedEventType('ALL');
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
          {filteredEvents.map((evt, idx) => {
          const isSelected = evt.sequence === selectedSequence;
          const isExpanded = !!expandedEvents[evt.sequence];
          const isSpike = evt.eventType === 'TEMPERATURE_SPIKE';
          const isDispute = evt.eventType === 'DISPUTE_FILED';
          const isTampered = !!evt.tampered;

          return (
            <div
              key={evt.id}
              className={`relative pl-12 transition-all group ${
                isSelected ? 'scale-[1.01]' : ''
              }`}
            >
              {/* Timeline Sequence Node */}
              <div
                className={`absolute left-4 top-4 -translate-x-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold transition-all shadow-md ${
                  isTampered
                    ? 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                    : isSpike
                    ? 'bg-red-950 border-red-500 text-red-400'
                    : isDispute
                    ? 'bg-rose-950 border-rose-500 text-rose-300'
                    : isSelected
                    ? 'bg-indigo-600 border-indigo-400 text-white ring-4 ring-indigo-500/30'
                    : 'bg-slate-900 border-slate-700 text-slate-300 group-hover:border-indigo-500'
                }`}
              >
                {evt.sequence}
              </div>

              {/* Event Card */}
              <div
                className={`rounded-xl border transition-all ${
                  isTampered
                    ? 'bg-red-950/40 border-red-600 shadow-lg shadow-red-950/50'
                    : isSpike
                    ? 'bg-red-950/20 border-red-800/80'
                    : isSelected
                    ? 'bg-slate-800/90 border-indigo-500/80 shadow-lg shadow-indigo-950/30'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                } p-4`}
              >
                {/* Event Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/70">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                      {getEventIcon(evt.eventType)}
                    </div>
                    <span className="font-bold text-white text-sm tracking-tight font-mono">
                      {evt.eventType}
                    </span>
                    {isTampered && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900 text-red-200 border border-red-600 font-bold animate-pulse">
                        HASH MISMATCH: TAMPER DETECTED
                      </span>
                    )}
                    {isSpike && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold">
                        EXCURSION (-4.2°C)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(evt.timestamp).toUTCString().slice(0, 25)}
                    </span>
                    <button
                      onClick={() => onSelectSequence(evt.sequence)}
                      className={`text-xs font-mono px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-indigo-300'
                      }`}
                      title="Fold and inspect state up to this exact event"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{isSelected ? 'Active State' : 'Fold to this'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const prevSeq = evt.sequence > 1 ? evt.sequence - 1 : 1;
                        setCompareSeqA(prevSeq);
                        setCompareSeqB(evt.sequence);
                        setShowCompareView(true);
                      }}
                      className="text-xs font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                      title={`Open side-by-side transition diff for Event #${evt.sequence}`}
                    >
                      <GitCompare className="w-3 h-3 text-cyan-400" />
                      <span>Compare</span>
                    </button>
                  </div>
                </div>

                {/* Event Summary Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3 text-xs">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block uppercase font-mono">
                      Actor & Organization
                    </span>
                    <span className="font-medium text-slate-200 truncate block">
                      {evt.actor.organization}
                    </span>
                    <span className="text-slate-400 text-[11px] truncate block">
                      {evt.actor.name} ({evt.actor.role})
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block uppercase font-mono">
                      Location & Device
                    </span>
                    <span className="font-medium text-slate-200 truncate block">
                      {evt.metadata.geo.locationName}
                    </span>
                    <span className="text-slate-400 text-[11px] font-mono truncate block">
                      {evt.metadata.deviceId || 'Edge Node'} ({evt.metadata.geo.lat.toFixed(2)},{' '}
                      {evt.metadata.geo.lng.toFixed(2)})
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] block uppercase font-mono">
                        Key Payload Metric
                      </span>
                      {evt.payload.temperature !== undefined ? (
                        <span
                          className={`font-mono font-bold text-sm ${
                            evt.payload.temperature < -15 || evt.payload.temperature > -25
                              ? 'text-red-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          Temp: {evt.payload.temperature}°C
                        </span>
                      ) : evt.payload.sealNumber ? (
                        <span className="font-mono text-xs text-amber-300 font-bold">
                          Seal: {evt.payload.sealNumber}
                        </span>
                      ) : evt.payload.claimAmountUSD ? (
                        <span className="font-mono text-xs text-red-400 font-bold">
                          Dispute: ${evt.payload.claimAmountUSD.toLocaleString()}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-300">
                          {Object.keys(evt.payload).length} payload fields
                        </span>
                      )}
                    </div>

                    {/* Quick Tamper button for testing forensic audit */}
                    <button
                      onClick={() => onOpenTamperTarget(evt.sequence)}
                      className="text-[10px] font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1 mt-1 transition-colors self-start"
                      title="Test tampering with this event's payload to verify audit detection"
                    >
                      <Bug className="w-3 h-3" />
                      <span>Simulate DB Tamper</span>
                    </button>
                  </div>
                </div>

                {/* Cryptographic Link Footer */}
                <div className="pt-2 border-t border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px] font-mono">
                  <div className="flex flex-wrap items-center gap-3 text-slate-400">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">PrevHash:</span>
                      <span className="text-slate-300 bg-slate-900 px-1 rounded">
                        {evt.previousHash.slice(0, 10)}...{evt.previousHash.slice(-6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Hash:</span>
                      <span
                        className={`px-1 rounded font-bold ${
                          isTampered
                            ? 'bg-red-950 text-red-300 border border-red-700'
                            : 'text-indigo-300 bg-slate-900'
                        }`}
                      >
                        {evt.hash.slice(0, 10)}...{evt.hash.slice(-6)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpand(evt.sequence)}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors self-start md:self-auto"
                  >
                    <span>{isExpanded ? 'Hide Payload' : 'Inspect JSON'}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Expandable JSON Inspector */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800 font-mono text-xs">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Raw Event Payload & Signatures</span>
                      <span className="text-indigo-400">ID: {evt.id}</span>
                    </div>
                    <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
                      {JSON.stringify(
                        {
                          sequence: evt.sequence,
                          globalSequence: evt.globalSequence,
                          eventType: evt.eventType,
                          timestamp: evt.timestamp,
                          actor: evt.actor,
                          payload: evt.payload,
                          metadata: evt.metadata,
                          previousHash: evt.previousHash,
                          hash: evt.hash,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
