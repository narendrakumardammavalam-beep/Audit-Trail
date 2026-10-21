import React from 'react';
import {
  AggregateState,
  LedgerEvent,
} from '../types/ledger';
import {
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Clock,
  UserCheck,
  Package,
  AlertTriangle,
  ArrowRight,
  Lock,
  Anchor,
  Plane,
  Truck,
  RotateCcw
} from 'lucide-react';

interface StateHeroProps {
  state: AggregateState;
  events: LedgerEvent[];
  selectedSequence: number;
  maxSequence: number;
  onResetToLatest: () => void;
}

export const StateHero: React.FC<StateHeroProps> = ({
  state,
  events,
  selectedSequence,
  maxSequence,
  onResetToLatest,
}) => {
  const isTimeTraveling = selectedSequence < maxSequence;
  const currentEvent = events.find((e) => e.sequence === selectedSequence);

  // Status color mappings
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AT_SEA':
        return { bg: 'bg-blue-950/60 text-blue-400 border-blue-800', icon: Anchor };
      case 'IN_TRANSIT':
        return { bg: 'bg-cyan-950/60 text-cyan-400 border-cyan-800', icon: Truck };
      case 'AT_PORT':
        return { bg: 'bg-indigo-950/60 text-indigo-400 border-indigo-800', icon: MapPin };
      case 'CUSTOMS_HOLD':
      case 'QUARANTINED':
        return { bg: 'bg-amber-950/60 text-amber-400 border-amber-800', icon: AlertTriangle };
      case 'DISPUTED':
        return { bg: 'bg-red-950/80 text-red-400 border-red-700 font-bold', icon: AlertTriangle };
      case 'DELIVERED':
        return { bg: 'bg-emerald-950/60 text-emerald-400 border-emerald-800', icon: ShieldCheck };
      default:
        return { bg: 'bg-slate-800 text-slate-300 border-slate-700', icon: Package };
    }
  };

  const statusConfig = getStatusBadge(state.status);
  const StatusIcon = statusConfig.icon;

  const isTempExcursion =
    state.telemetry.currentTemperature < state.telemetry.temperatureTarget.min ||
    state.telemetry.currentTemperature > state.telemetry.temperatureTarget.max;

  return (
    <div className="space-y-4">
      {/* Time-Travel Historical Notification Banner */}
      {isTimeTraveling && (
        <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/60 to-slate-900 border border-amber-600/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300">
              <Clock className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  Time-Travel Replay
                </span>
                <span className="text-sm font-semibold text-white">
                  Folded State at Event #{selectedSequence} of {maxSequence}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Reconstructed snapshot at {new Date(state.lastUpdatedAt).toUTCString()} ({currentEvent?.eventType.replace(/_/g, ' ')}).
                Future events from #{selectedSequence + 1} to #{maxSequence} are mathematically excluded.
              </p>
            </div>
          </div>
          <button
            onClick={onResetToLatest}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow active:scale-95 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Jump to Present (Seq #{maxSequence})
          </button>
        </div>
      )}

      {/* Main Aggregator State Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-sm font-mono font-bold text-indigo-400 tracking-wider bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-800/60">
                {state.aggregateId}
              </span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${statusConfig.bg}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{state.status.replace(/_/g, ' ')}</span>
              </div>
              {state.disputes.some((d) => d.status === 'OPEN') && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-700 text-xs font-bold animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Active Legal Dispute ($
                  {state.disputes
                    .filter((d) => d.status === 'OPEN')
                    .reduce((sum, d) => sum + d.claimAmountUSD, 0)
                    .toLocaleString()}
                  )
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {state.title}
            </h2>
          </div>

          {/* Route path */}
          <div className="flex items-center gap-2 text-xs font-mono bg-slate-950/70 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Origin</span>
              <span className="text-slate-200 font-semibold">{state.origin}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 mx-1" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Destination</span>
              <span className="text-slate-200 font-semibold">{state.destination}</span>
            </div>
          </div>
        </div>

        {/* High-Density State Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Card 1: Reconstructed Cold-Chain Temperature */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Thermometer className="w-4 h-4 text-cyan-400" /> Cold-Chain Telemetry
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                Safe: {state.telemetry.temperatureTarget.min}°C to {state.telemetry.temperatureTarget.max}°C
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold font-mono tracking-tight ${
                    isTempExcursion ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                  }`}
                >
                  {state.telemetry.currentTemperature.toFixed(1)}°C
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({state.telemetry.currentHumidity.toFixed(0)}% RH)
                </span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                  isTempExcursion
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {isTempExcursion ? 'CRITICAL EXCURSION' : 'NOMINAL'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between border-t border-slate-800/60 pt-1.5 font-mono">
              <span>Peak: {state.telemetry.maxRecordedTemp.toFixed(1)}°C</span>
              <span>Spikes: {state.telemetry.spikeIncidentsCount}</span>
            </div>
          </div>

          {/* Card 2: Legal Custodian & Chain of Custody */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <UserCheck className="w-4 h-4 text-indigo-400" /> Current Legal Custodian
              </span>
              <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-900">
                Signed
              </span>
            </div>
            <div className="mt-1">
              <div className="text-sm font-semibold text-white truncate">
                {state.currentCustodian.organization}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {state.currentCustodian.name} ({state.currentCustodian.role})
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 font-mono truncate border-t border-slate-800/60 pt-1.5">
              Key: {state.currentCustodian.publicKey}
            </div>
          </div>

          {/* Card 3: Physical & Digital Bolt Seal */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="w-4 h-4 text-amber-400" /> Container Bolt Seal
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  state.sealInfo.isIntact
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                    : 'bg-red-950 text-red-400 border border-red-900'
                }`}
              >
                {state.sealInfo.isIntact ? 'INTACT' : 'BREACHED'}
              </span>
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-slate-200">
              {state.sealInfo.sealNumber}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 truncate border-t border-slate-800/60 pt-1.5">
              Geo: {state.currentLocation.locationName}
            </div>
          </div>

          {/* Card 4: Cargo Manifest & Valuation */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Package className="w-4 h-4 text-purple-400" /> Cargo Valuation
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {state.cargoManifest.reduce((acc, i) => acc + i.quantity, 0)} Units
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-bold font-mono text-white">
                ${state.totalCargoValueUSD.toLocaleString()}
              </span>
              {state.spoiledItemsCount > 0 && (
                <span className="text-[10px] font-mono text-red-400 bg-red-950 px-1.5 py-0.5 rounded border border-red-900">
                  {state.spoiledItemsCount} Spoiled
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 truncate border-t border-slate-800/60 pt-1.5 font-mono">
              {state.cargoManifest[0]?.sku || 'MANIFEST_EMPTY'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
