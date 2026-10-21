import React, { useState, useEffect, useRef } from 'react';
import { LedgerEvent } from '../types/ledger';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Flame,
  AlertOctagon
} from 'lucide-react';

interface TimeTravelSliderProps {
  events: LedgerEvent[];
  selectedSequence: number;
  maxSequence: number;
  onSelectSequence: (sequence: number) => void;
}

export const TimeTravelSlider: React.FC<TimeTravelSliderProps> = ({
  events,
  selectedSequence,
  maxSequence,
  onSelectSequence,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 4x
  const timerRef = useRef<any>(null);
  const selectedSeqRef = useRef(selectedSequence);
  selectedSeqRef.current = selectedSequence;

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(1400 / playbackSpeed);
      timerRef.current = setInterval(() => {
        const next = selectedSeqRef.current + 1;
        if (next > maxSequence) {
          setIsPlaying(false);
        } else {
          onSelectSequence(next);
        }
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, maxSequence, onSelectSequence]);

  const activeEvent = events.find((e) => e.sequence === selectedSequence);

  const getEventMarkerColor = (evt: LedgerEvent) => {
    if (evt.eventType === 'TEMPERATURE_SPIKE') return 'bg-red-500 ring-2 ring-red-400';
    if (evt.eventType === 'DISPUTE_FILED') return 'bg-rose-500 ring-2 ring-rose-300';
    if (evt.eventType === 'CUSTODY_TRANSFERRED') return 'bg-cyan-400';
    if (evt.eventType === 'SEAL_AFFIXED' || evt.eventType === 'CUSTOMS_INSPECTED') return 'bg-amber-400';
    if (evt.eventType === 'LOADED_ON_VESSEL' || evt.eventType === 'CONTAINER_CREATED') return 'bg-indigo-400';
    return 'bg-slate-500';
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl relative">
      {/* Top Bar: Explainer & Active Sequence */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
              <Clock className="w-3.5 h-3.5" /> Event-Sourcing Time Machine
            </span>
            <span className="text-xs text-slate-400">
              Fold engine replays events 1 → {selectedSequence}
            </span>
          </div>
          <div className="text-sm font-semibold text-white mt-1 flex items-center gap-2">
            <span>Sequence #{selectedSequence} of {maxSequence}:</span>
            <span className="text-indigo-300 font-mono">
              {activeEvent?.eventType.replace(/_/g, ' ')}
            </span>
            {activeEvent?.eventType === 'TEMPERATURE_SPIKE' && (
              <span className="text-[11px] font-mono px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded-full font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> Critical Excursion
              </span>
            )}
            {activeEvent?.eventType === 'DISPUTE_FILED' && (
              <span className="text-[11px] font-mono px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-full font-bold flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> Dispute Logged
              </span>
            )}
          </div>
        </div>

        {/* Playback Controls & Speed Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Step Back to First */}
          <button
            onClick={() => onSelectSequence(1)}
            disabled={selectedSequence <= 1}
            title="First Event"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Step -1 */}
          <button
            onClick={() => onSelectSequence(Math.max(1, selectedSequence - 1))}
            disabled={selectedSequence <= 1}
            title="Previous Event"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => {
              if (selectedSequence >= maxSequence && !isPlaying) {
                onSelectSequence(1);
              }
              setIsPlaying(!isPlaying);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{selectedSequence >= maxSequence ? 'Replay' : 'Play'}</span>
              </>
            )}
          </button>

          {/* Step +1 */}
          <button
            onClick={() => onSelectSequence(Math.min(maxSequence, selectedSequence + 1))}
            disabled={selectedSequence >= maxSequence}
            title="Next Event"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Step to Latest */}
          <button
            onClick={() => onSelectSequence(maxSequence)}
            disabled={selectedSequence >= maxSequence}
            title="Latest Head Event"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-[11px] font-mono text-slate-400 ml-1">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrubbing Range Slider with Event Ticks */}
      <div className="relative pt-3 pb-1">
        <input
          type="range"
          min={1}
          max={Math.max(1, maxSequence)}
          value={selectedSequence}
          onChange={(e) => {
            setIsPlaying(false);
            onSelectSequence(Number(e.target.value));
          }}
          className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />

        {/* Visual tick dots along the track */}
        <div className="flex justify-between items-center px-1 mt-2.5">
          {events.map((evt) => {
            const isCurrent = evt.sequence === selectedSequence;
            return (
              <button
                key={evt.sequence}
                onClick={() => {
                  setIsPlaying(false);
                  onSelectSequence(evt.sequence);
                }}
                className={`group relative flex flex-col items-center focus:outline-none`}
                title={`Event #${evt.sequence}: ${evt.eventType} (${new Date(evt.timestamp).toLocaleTimeString()})`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all ${getEventMarkerColor(
                    evt
                  )} ${isCurrent ? 'scale-150 ring-2 ring-white shadow-lg shadow-indigo-500' : 'opacity-70 hover:opacity-100 group-hover:scale-125'}`}
                />
                <span
                  className={`text-[9px] font-mono mt-1 transition-colors ${
                    isCurrent ? 'text-indigo-300 font-bold' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                >
                  #{evt.sequence}
                </span>

                {/* Hover Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-20">
                  <div className="bg-slate-950 text-white text-[10px] rounded px-2 py-1 shadow-xl border border-slate-700 whitespace-nowrap font-mono">
                    <div className="font-bold text-indigo-400">Seq #{evt.sequence}: {evt.eventType}</div>
                    <div className="text-slate-400">{new Date(evt.timestamp).toUTCString().slice(0, 22)}</div>
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-950 border-r border-b border-slate-700 transform rotate-45 -mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
