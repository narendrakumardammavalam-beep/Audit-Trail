import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { TelemetryPoint } from '../types/ledger';
import {
  Thermometer,
  AlertTriangle,
  Activity,
  Flame,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface TelemetryChartProps {
  telemetryData: TelemetryPoint[];
  selectedSequence: number;
  minSafeTemp: number;
  maxSafeTemp: number;
  onSelectSequence?: (seq: number) => void;
}

interface AnomalyCluster {
  id: string;
  startIndex: number;
  endIndex: number;
  startTimeLabel: string;
  endTimeLabel: string;
  peakTemp: number;
  maxVariance: number;
  severity: 'CRITICAL_EXCURSION' | 'MODERATE_WARNING';
  affectedSequences: number[];
  description: string;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  telemetryData,
  selectedSequence,
  minSafeTemp,
  maxSafeTemp,
  onSelectSequence,
}) => {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);

  // Compute thermal bounds for plot
  const temps = telemetryData.map((d) => d.temperature);
  const minTempInPlot = temps.length > 0 ? Math.min(minSafeTemp - 5, ...temps) - 2 : minSafeTemp - 5;
  const maxTempInPlot = temps.length > 0 ? Math.max(maxSafeTemp + 5, ...temps) + 2 : maxSafeTemp + 5;

  // Detect and group Anomaly & Instability Clusters across timeline
  const anomalyClusters = useMemo(() => {
    const clusters: AnomalyCluster[] = [];
    if (telemetryData.length === 0) return clusters;

    let currentCluster: {
      startIndex: number;
      endIndex: number;
      peakTemp: number;
      sequences: number[];
      isExcursion: boolean;
    } | null = null;

    for (let i = 0; i < telemetryData.length; i++) {
      const pt = telemetryData[i];
      const isBreach = pt.temperature < minSafeTemp || pt.temperature > maxSafeTemp || pt.isSpike;

      if (isBreach) {
        if (!currentCluster) {
          currentCluster = {
            startIndex: i,
            endIndex: i,
            peakTemp: pt.temperature,
            sequences: [pt.sequence],
            isExcursion: true,
          };
        } else {
          currentCluster.endIndex = i;
          currentCluster.sequences.push(pt.sequence);
          if (Math.abs(pt.temperature) > Math.abs(currentCluster.peakTemp)) {
            currentCluster.peakTemp = pt.temperature;
          }
        }
      } else {
        if (currentCluster) {
          // Push completed cluster
          const startPt = telemetryData[currentCluster.startIndex];
          const endPt = telemetryData[currentCluster.endIndex];
          clusters.push({
            id: `cluster-${currentCluster.startIndex}-${currentCluster.endIndex}`,
            startIndex: currentCluster.startIndex,
            endIndex: currentCluster.endIndex,
            startTimeLabel: startPt.timeLabel,
            endTimeLabel: endPt.timeLabel,
            peakTemp: currentCluster.peakTemp,
            maxVariance: Math.abs(currentCluster.peakTemp - (maxSafeTemp + minSafeTemp) / 2),
            severity:
              currentCluster.peakTemp > maxSafeTemp + 3 || currentCluster.peakTemp < minSafeTemp - 3
                ? 'CRITICAL_EXCURSION'
                : 'MODERATE_WARNING',
            affectedSequences: currentCluster.sequences,
            description: `Thermal breach detected (Peak: ${currentCluster.peakTemp.toFixed(1)}°C, Corridor: ${minSafeTemp}°C to ${maxSafeTemp}°C)`,
          });
          currentCluster = null;
        }
      }
    }

    // Flush last cluster if active at the end
    if (currentCluster) {
      const startPt = telemetryData[currentCluster.startIndex];
      const endPt = telemetryData[currentCluster.endIndex];
      clusters.push({
        id: `cluster-${currentCluster.startIndex}-${currentCluster.endIndex}`,
        startIndex: currentCluster.startIndex,
        endIndex: currentCluster.endIndex,
        startTimeLabel: startPt.timeLabel,
        endTimeLabel: endPt.timeLabel,
        peakTemp: currentCluster.peakTemp,
        maxVariance: Math.abs(currentCluster.peakTemp - (maxSafeTemp + minSafeTemp) / 2),
        severity:
          currentCluster.peakTemp > maxSafeTemp + 3 || currentCluster.peakTemp < minSafeTemp - 3
            ? 'CRITICAL_EXCURSION'
            : 'MODERATE_WARNING',
        affectedSequences: currentCluster.sequences,
        description: `Thermal breach detected (Peak: ${currentCluster.peakTemp.toFixed(1)}°C)`,
      });
    }

    return clusters;
  }, [telemetryData, minSafeTemp, maxSafeTemp]);

  if (telemetryData.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-500">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        No telemetry events recorded yet for this container.
      </div>
    );
  }

  // Calculate heatmap color for a telemetry point
  const getHeatmapColorForPoint = (pt: TelemetryPoint) => {
    const isExcursion = pt.temperature < minSafeTemp || pt.temperature > maxSafeTemp || pt.isSpike;
    if (isExcursion) {
      return 'bg-gradient-to-t from-red-600 via-rose-500 to-amber-500 text-white shadow-lg shadow-red-500/40 ring-1 ring-red-400';
    }
    const distToMax = Math.abs(pt.temperature - maxSafeTemp);
    const distToMin = Math.abs(pt.temperature - minSafeTemp);
    if (distToMax < 1.0 || distToMin < 1.0) {
      return 'bg-amber-500/80 text-amber-950 border border-amber-400';
    }
    return 'bg-emerald-500/70 text-emerald-950 hover:bg-emerald-400';
  };

  const getHeatmapLabel = (pt: TelemetryPoint) => {
    if (pt.temperature < minSafeTemp || pt.temperature > maxSafeTemp || pt.isSpike) {
      return 'CRITICAL ANOMALY';
    }
    const distToMax = Math.abs(pt.temperature - maxSafeTemp);
    const distToMin = Math.abs(pt.temperature - minSafeTemp);
    if (distToMax < 1.0 || distToMin < 1.0) {
      return 'ELEVATED FLUX';
    }
    return 'STABLE';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Header & Heatmap Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Thermometer className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">
              Cold-Chain Forensic Telemetry Timeline
            </h3>
            {anomalyClusters.length > 0 ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-bold flex items-center gap-1 animate-pulse">
                <Flame className="w-3 h-3 text-red-400" />
                {anomalyClusters.length} Instability {anomalyClusters.length === 1 ? 'Cluster' : 'Clusters'} Detected
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                Thermal Corridors Stable
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time IoT temperature sensor readings overlaid with visual anomaly heatmap clustering
          </p>
        </div>

        {/* Heatmap Overlay Switch & Legend */}
        <div className="flex items-center gap-3">
          {/* Heatmap Toggle Switch */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all ${
              showHeatmap
                ? 'bg-rose-950/80 text-rose-300 border-rose-800 shadow-md shadow-rose-950/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle visual thermal instability heatmap overlay"
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Heatmap Overlay: {showHeatmap ? 'ACTIVE' : 'MUTED'}</span>
          </button>

          {/* Quick Legend */}
          <div className="hidden lg:flex items-center gap-2.5 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse" />
              <span>Breach</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Safe Corridor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Line Chart with Heatmap Zones */}
      <div className="h-64 sm:h-72 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={telemetryData} margin={{ top: 12, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              fontFamily="JetBrains Mono"
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={[Math.floor(minTempInPlot), Math.ceil(maxTempInPlot)]}
              unit="°C"
              tickLine={false}
              fontFamily="JetBrains Mono"
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data: TelemetryPoint = payload[0].payload;
                const isViolation = data.temperature < minSafeTemp || data.temperature > maxSafeTemp;
                const activeCluster = anomalyClusters.find((c) => c.affectedSequences.includes(data.sequence));

                return (
                  <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs font-mono min-w-[240px]">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                      <span className="text-indigo-400 font-bold">Seq #{data.sequence}</span>
                      <span className="text-slate-400">{data.timeLabel}</span>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400">Event:</span>
                      <span className="text-white font-semibold">{data.eventTitle}</span>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400">Temperature:</span>
                      <span
                        className={`font-bold text-sm ${
                          isViolation ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                        }`}
                      >
                        {data.temperature.toFixed(1)}°C
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400">Safe Range:</span>
                      <span className="text-slate-300">
                        {minSafeTemp}°C to {maxSafeTemp}°C
                      </span>
                    </div>

                    {/* Heatmap Cluster Status */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 mb-1">
                      <span className="text-slate-400">Heatmap Index:</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          isViolation
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-900'
                        }`}
                      >
                        {getHeatmapLabel(data)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Custodian:</span>
                      <span className="text-indigo-300 truncate max-w-[140px]">
                        {data.custodianOrg}
                      </span>
                    </div>

                    {isViolation && (
                      <div className="mt-2 pt-1.5 border-t border-red-900/60 text-red-400 font-bold flex items-center gap-1.5 text-[11px] animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        INSTABILITY CLUSTER BREACH
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Safe Temperature Band */}
            <ReferenceArea
              y1={minSafeTemp}
              y2={maxSafeTemp}
              fill="#10b981"
              fillOpacity={0.06}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeOpacity={0.35}
            />

            {/* Threshold Reference Lines */}
            <ReferenceLine
              y={maxSafeTemp}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{
                value: `Max Threshold (${maxSafeTemp}°C)`,
                fill: '#ef4444',
                fontSize: 10,
                position: 'right',
                fontFamily: 'JetBrains Mono',
              }}
            />
            <ReferenceLine
              y={minSafeTemp}
              stroke="#38bdf8"
              strokeDasharray="3 3"
              label={{
                value: `Min Threshold (${minSafeTemp}°C)`,
                fill: '#38bdf8',
                fontSize: 10,
                position: 'right',
                fontFamily: 'JetBrains Mono',
              }}
            />

            {/* Heatmap Overlay: Highlighting Anomaly Clusters across Timeline */}
            {showHeatmap &&
              anomalyClusters.map((cluster) => (
                <ReferenceArea
                  key={cluster.id}
                  x1={cluster.startTimeLabel}
                  x2={cluster.endTimeLabel}
                  fill="#dc2626"
                  fillOpacity={hoveredClusterId === cluster.id ? 0.35 : 0.22}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: `⚠️ Thermal Anomaly Cluster (Peak: ${cluster.peakTemp}°C)`,
                    fill: '#fca5a5',
                    fontSize: 10,
                    position: 'insideTop',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 'bold',
                  }}
                />
              ))}

            {/* Active Time Travel Sequence Line */}
            {telemetryData.some((d) => d.sequence === selectedSequence) && (
              <ReferenceLine
                x={telemetryData.find((d) => d.sequence === selectedSequence)?.timeLabel}
                stroke="#a855f7"
                strokeWidth={2}
                label={{
                  value: `Replay #Seq ${selectedSequence}`,
                  fill: '#c084fc',
                  fontSize: 10,
                  position: 'top',
                  fontFamily: 'JetBrains Mono',
                }}
              />
            )}

            {/* Temperature Curve */}
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy) return null;
                const isSpike = payload.isSpike;
                const isSelected = payload.sequence === selectedSequence;

                if (isSpike) {
                  return (
                    <g key={`spike-${payload.sequence}`}>
                      <circle cx={cx} cy={cy} r={8} fill="#ef4444" className="animate-pulse" />
                      <circle cx={cx} cy={cy} r={4} fill="#ffffff" />
                    </g>
                  );
                }

                if (isSelected) {
                  return (
                    <g key={`selected-${payload.sequence}`}>
                      <circle cx={cx} cy={cy} r={6} fill="#a855f7" />
                      <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
                    </g>
                  );
                }

                return (
                  <circle
                    key={`dot-${payload.sequence}`}
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill="#0284c7"
                    stroke="#090d16"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Visual Heatmap Density Strip (Interactive Timeline Ribbon) */}
      {showHeatmap && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Thermal Instability Heatmap Density Strip
            </span>
            <span className="text-[10px] text-slate-500">
              Click any block to scrub time machine directly to that event
            </span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
            {telemetryData.map((pt) => {
              const isSelected = pt.sequence === selectedSequence;
              const isExcursion = pt.temperature < minSafeTemp || pt.temperature > maxSafeTemp || pt.isSpike;

              return (
                <button
                  key={pt.sequence}
                  onClick={() => onSelectSequence && onSelectSequence(pt.sequence)}
                  className={`p-2 rounded-lg text-left transition-all relative overflow-hidden group cursor-pointer ${
                    isExcursion
                      ? 'bg-red-950/90 border border-red-500 shadow-sm shadow-red-950'
                      : 'bg-slate-950/80 border border-slate-800 hover:border-slate-700'
                  } ${isSelected ? 'ring-2 ring-indigo-400' : ''}`}
                  title={`Event #${pt.sequence}: ${pt.temperature}°C (${pt.timeLabel}) - Click to inspect`}
                >
                  {/* Heat gradient bar */}
                  <div
                    className={`h-1.5 w-full rounded-full mb-1.5 ${
                      isExcursion
                        ? 'bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 animate-pulse'
                        : 'bg-emerald-500/70'
                    }`}
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-slate-300">#{pt.sequence}</span>
                    <span
                      className={`font-mono font-bold ${
                        isExcursion ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {pt.temperature.toFixed(0)}°
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 truncate font-mono mt-0.5">
                    {pt.timeLabel.split(' ')[1] || pt.timeLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
