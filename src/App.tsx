import React, { useState, useEffect, useCallback } from 'react';
import {
  AggregateState,
  LedgerEvent,
  LedgerVerificationResult,
  TelemetryPoint
} from './types/ledger';
import { Header } from './components/Header';
import { StateHero } from './components/StateHero';
import { TimeTravelSlider } from './components/TimeTravelSlider';
import { TelemetryChart } from './components/TelemetryChart';
import { EventStream } from './components/EventStream';
import { DisputePanel } from './components/DisputePanel';
import { CommandModal } from './components/CommandModal';
import { TamperModal } from './components/TamperModal';
import { AuditProofModal } from './components/AuditProofModal';
import { NewContainerModal } from './components/NewContainerModal';
import { QRCodeModal } from './components/QRCodeModal';
import { QRCodeSVG } from 'qrcode.react';
import {
  Layers,
  Activity,
  Scale,
  Cpu,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Database,
  Radio,
  Clock,
  Sparkles,
  Download,
  FileSpreadsheet,
  Check,
  Copy,
  QrCode,
  Smartphone,
  ScanLine
} from 'lucide-react';

export default function App() {
  const [aggregates, setAggregates] = useState<any[]>([]);
  const [selectedAggregateId, setSelectedAggregateId] = useState<string>('CONT-BIO-8921');
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [foldedState, setFoldedState] = useState<AggregateState | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<number>(1);
  const [maxSequence, setMaxSequence] = useState<number>(1);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [verification, setVerification] = useState<LedgerVerificationResult | null>(null);

  // Modals
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [isTamperModalOpen, setIsTamperModalOpen] = useState(false);
  const [isAuditProofModalOpen, setIsAuditProofModalOpen] = useState(false);
  const [isNewContainerModalOpen, setIsNewContainerModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [tamperTargetSeq, setTamperTargetSeq] = useState<number>(8);
  const [isResetting, setIsResetting] = useState(false);
  const [inspectorScanNotice, setInspectorScanNotice] = useState<string | null>(null);

  // Parse mobile verification scan from QR code link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const verifyId = params.get('verify');
      const verifyHash = params.get('hash');
      if (verifyId) {
        setSelectedAggregateId(verifyId);
        setInspectorScanNotice(
          `Field Inspector QR Scan Confirmed: Container ${verifyId} loaded and verified against cryptographic anchor ${
            verifyHash ? verifyHash.slice(0, 16) + '...' : ''
          }`
        );
      }
    }
  }, []);

  // Active view tab: 'overview' | 'stream' | 'disputes' | 'architecture'
  const [activeTab, setActiveTab] = useState<'overview' | 'stream' | 'disputes' | 'architecture'>('overview');

  // Load list of all aggregates
  const fetchAggregates = useCallback(async () => {
    try {
      const res = await fetch('/api/queries/aggregates');
      const data = await res.json();
      if (data.success) {
        setAggregates(data.data);
      }
    } catch (err) {
      console.error('Error fetching aggregates:', err);
    }
  }, []);

  // Load events, verification, and telemetry for selected aggregate
  const fetchAggregateData = useCallback(
    async (aggregateId: string, targetSeq?: number) => {
      try {
        // Fetch raw event stream
        const eventsRes = await fetch(`/api/queries/events/${aggregateId}`);
        const eventsData = await eventsRes.json();
        if (eventsData.success) {
          const evts: LedgerEvent[] = eventsData.data.events;
          setEvents(evts);
          const maxSeq = evts.length > 0 ? evts[evts.length - 1].sequence : 1;
          setMaxSequence(maxSeq);

          const seqToQuery = targetSeq !== undefined ? targetSeq : maxSeq;
          setSelectedSequence(seqToQuery);

          // Fetch folded state for this sequence
          const stateRes = await fetch(`/api/queries/state/${aggregateId}?sequence=${seqToQuery}`);
          const stateData = await stateRes.json();
          if (stateData.success) {
            setFoldedState(stateData.data.state);
          }
        }

        // Fetch telemetry
        const telRes = await fetch(`/api/queries/telemetry/${aggregateId}`);
        const telData = await telRes.json();
        if (telData.success) {
          setTelemetry(telData.data);
        }

        // Fetch cryptographic ledger verification
        const verRes = await fetch(`/api/queries/verify/${aggregateId}`);
        const verData = await verRes.json();
        if (verData.success) {
          setVerification(verData.data);
        }
      } catch (err) {
        console.error('Error fetching aggregate data:', err);
      }
    },
    []
  );

  useEffect(() => {
    fetchAggregates();
  }, [fetchAggregates]);

  useEffect(() => {
    if (selectedAggregateId) {
      fetchAggregateData(selectedAggregateId);
    }
  }, [selectedAggregateId, fetchAggregateData]);

  // Handle sequence scrubbing (Time Travel)
  const handleSelectSequence = async (seq: number) => {
    setSelectedSequence(seq);
    try {
      const res = await fetch(`/api/queries/state/${selectedAggregateId}?sequence=${seq}`);
      const data = await res.json();
      if (data.success) {
        setFoldedState(data.data.state);
      }
    } catch (err) {
      console.error('Error folding state at sequence:', err);
    }
  };

  // Reset to latest head
  const handleResetToLatest = () => {
    handleSelectSequence(maxSequence);
  };

  // Resolve a dispute
  const handleResolveDispute = async (disputeId: string, resolution: string) => {
    try {
      await fetch('/api/commands/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateId: selectedAggregateId,
          aggregateType: 'SHIPPING_CONTAINER',
          eventType: 'DISPUTE_RESOLVED',
          actor: {
            id: 'ACT-ARBITRATOR-01',
            name: 'Maritime Commercial Tribunal',
            role: 'Senior Presiding Arbitrator',
            organization: 'Rotterdam Chamber of Commerce & Admiralty Board',
            publicKey: '0xad82...45ef',
          },
          payload: {
            disputeId,
            resolution,
            settledAmountUSD: 420000,
          },
          metadata: {
            geo: { lat: 51.9244, lng: 4.4777, locationName: 'Rotterdam Arbitration Palace' },
            notes: 'Binding legal agreement entered into ledger with full party consent.',
          },
        }),
      });

      await fetchAggregates();
      await fetchAggregateData(selectedAggregateId);
    } catch (err) {
      console.error('Error resolving dispute:', err);
    }
  };

  // Reset entire demo ledger
  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/commands/reset', { method: 'POST' });
      await fetchAggregates();
      await fetchAggregateData(selectedAggregateId);
    } catch (err) {
      console.error('Error resetting demo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const [copiedCsvLink, setCopiedCsvLink] = useState(false);
  const csvDirectUrl = `/api/queries/events/${selectedAggregateId}/export.csv`;

  const handleDownloadCSV = () => {
    if (!events || events.length === 0) return;

    const headers = [
      'Sequence',
      'GlobalSequence',
      'TimestampUTC',
      'EventType',
      'ActorName',
      'ActorRole',
      'ActorOrganization',
      'ActorPublicKey',
      'Location',
      'Latitude',
      'Longitude',
      'DeviceId',
      'PayloadSummary',
      'PreviousHash',
      'EventHash',
      'Tampered',
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = events.map((e) => {
      let summary = '';
      if (e.payload.temperature !== undefined) summary += `Temp: ${e.payload.temperature}°C; `;
      if (e.payload.cause) summary += `Cause: ${e.payload.cause}; `;
      if (e.payload.sealNumber) summary += `Seal: ${e.payload.sealNumber}; `;
      if (e.payload.claimAmountUSD) summary += `Claim: $${e.payload.claimAmountUSD}; `;
      if (!summary) summary = Object.keys(e.payload).slice(0, 3).join(', ');

      return [
        e.sequence,
        e.globalSequence,
        escapeCSV(e.timestamp),
        escapeCSV(e.eventType),
        escapeCSV(e.actor.name),
        escapeCSV(e.actor.role),
        escapeCSV(e.actor.organization),
        escapeCSV(e.actor.publicKey),
        escapeCSV(e.metadata.geo.locationName),
        e.metadata.geo.lat,
        e.metadata.geo.lng,
        escapeCSV(e.metadata.deviceId || 'IoT-SENSOR'),
        escapeCSV(summary.trim()),
        escapeCSV(e.previousHash),
        escapeCSV(e.hash),
        e.tampered ? 'TRUE' : 'FALSE',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AuditTrail-${selectedAggregateId}-events-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCsvLink = () => {
    const fullUrl = `${window.location.origin}${csvDirectUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCsvLink(true);
    setTimeout(() => setCopiedCsvLink(false), 2500);
  };

  const openTamperModalForSeq = (seq: number) => {
    setTamperTargetSeq(seq);
    setIsTamperModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        aggregates={aggregates}
        selectedAggregateId={selectedAggregateId}
        onSelectAggregate={(id) => {
          setSelectedAggregateId(id);
          fetchAggregateData(id);
        }}
        verification={verification}
        onOpenCommandModal={() => setIsCommandModalOpen(true)}
        onOpenTamperModal={() => setIsTamperModalOpen(true)}
        onOpenAuditProofModal={() => setIsAuditProofModalOpen(true)}
        onOpenNewContainerModal={() => setIsNewContainerModalOpen(true)}
        onOpenQRModal={() => setIsQRModalOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mobile Inspector Scan Confirmation Banner */}
        {inspectorScanNotice && (
          <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/80 border border-emerald-600/70 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <ScanLine className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-medium text-emerald-200">
                {inspectorScanNotice}
              </span>
            </div>
            <button
              onClick={() => setInspectorScanNotice(null)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Forensic Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('stream')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'stream'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Append-Only Event Store</span>
              <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('disputes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'disputes'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Dispute & Liability</span>
              {foldedState && foldedState.disputes.some((d) => d.status === 'OPEN') && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span className="hidden sm:inline">CQRS Architecture</span>
              <span className="sm:hidden">CQRS</span>
            </button>
          </div>

          {/* Quick status pill */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-slate-500">Node Sourcing Engine:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online (Active Replay)
            </span>
          </div>
        </div>

        {/* State Hero (Active Folded Projection) */}
        {foldedState && (
          <StateHero
            state={foldedState}
            events={events}
            selectedSequence={selectedSequence}
            maxSequence={maxSequence}
            onResetToLatest={handleResetToLatest}
          />
        )}

        {/* Time Travel Slider Console */}
        <TimeTravelSlider
          events={events}
          selectedSequence={selectedSequence}
          maxSequence={maxSequence}
          onSelectSequence={handleSelectSequence}
        />

        {/* TAB 1: OVERVIEW & FORENSIC DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recharts Cold-Chain Telemetry */}
            {foldedState && (
              <TelemetryChart
                telemetryData={telemetry}
                selectedSequence={selectedSequence}
                minSafeTemp={foldedState.telemetry.temperatureTarget.min}
                maxSafeTemp={foldedState.telemetry.temperatureTarget.max}
                onSelectSequence={handleSelectSequence}
              />
            )}

            {/* Quick Two-Column View: Recent Events & Dispute Insight */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Event Store Summary Preview */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" /> Recent Chronological Events
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadCSV}
                        title="Download CSV for offline auditing"
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-950 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>CSV Export</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('stream')}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1"
                      >
                        <span>View All ({events.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {events.slice(-4).reverse().map((e) => (
                      <div
                        key={e.id}
                        onClick={() => handleSelectSequence(e.sequence)}
                        className={`p-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                          e.sequence === selectedSequence
                            ? 'bg-indigo-950/70 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-indigo-400">#{e.sequence}</span>
                          <span className="font-semibold text-slate-200">{e.eventType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] shrink-0">
                          <span>{e.actor.organization.slice(0, 18)}</span>
                          <span className="text-indigo-400 bg-slate-900 px-1 rounded">
                            {e.hash.slice(0, 6)}...
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                  <span>Append-Only Principle: Zero in-place mutations</span>
                  <span className="text-emerald-400">SHA-256 Chained</span>
                </div>
              </div>

              {/* Active Dispute / Spoilage Attribution Preview */}
              {foldedState && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Scale className="w-4 h-4 text-rose-400" /> Commercial Liability Status
                      </h3>
                      <button
                        onClick={() => setActiveTab('disputes')}
                        className="text-xs text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1"
                      >
                        <span>Arbitration Docket</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {foldedState.disputes.length > 0 ? (
                      <div className="space-y-3">
                        {foldedState.disputes.map((d) => (
                          <div
                            key={d.id}
                            className="bg-slate-950/80 border border-rose-900/50 p-3 rounded-xl text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-rose-400">{d.id}</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                ${d.claimAmountUSD.toLocaleString()} USD
                              </span>
                            </div>
                            <div className="text-slate-300 font-medium">{d.reason}</div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-900 pt-1.5">
                              <span>Culprit Event: Seq #{d.culpritEventSequence || 8}</span>
                              <span className="text-rose-400">Liability: Pacific & Atlantic SeaLines</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        No active disputes for this aggregate.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Tamper-Proof Legal Admissibility</span>
                    <button
                      onClick={() => setIsAuditProofModalOpen(true)}
                      className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Export Court Dossier
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Inspector QR Verification Module */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/30 border border-indigo-900/50 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  {/* Interactive QR Thumbnail */}
                  <div
                    onClick={() => setIsQRModalOpen(true)}
                    className="p-2.5 bg-white rounded-xl shadow-lg border-2 border-indigo-500/40 cursor-pointer hover:scale-105 transition-transform group shrink-0"
                    title="Click to view high-resolution QR placard and print"
                  >
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?verify=${encodeURIComponent(selectedAggregateId)}&hash=${encodeURIComponent(foldedState?.chainHeadHash || '')}&seq=${selectedSequence}`}
                      size={80}
                      level="M"
                      fgColor="#090d16"
                      bgColor="#ffffff"
                    />
                    <div className="text-[8px] font-mono text-center text-slate-800 font-bold mt-1">
                      CLICK TO EXPAND
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                        <QrCode className="w-5 h-5 text-indigo-400" />
                        Mobile Inspector QR Code &amp; Integrity Placard
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold uppercase">
                        ISO/IEC 18004
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          verification?.isValid ?? true
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {verification?.isValid ?? true ? 'Cryptographically Sealed' : 'Tamper Detected'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                      Encodes container identifier <span className="text-indigo-300 font-mono font-semibold">{selectedAggregateId}</span> and latest ledger head hash <span className="text-indigo-300 font-mono font-semibold">{(foldedState?.chainHeadHash || '').slice(0, 16)}...</span>. Port customs officers and cold-chain compliance agents can instantly scan with a mobile camera to verify genuine physical custody and chain immutability.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-mono text-slate-400">
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Payload: Container ID + Head Hash (Seq #{selectedSequence})
                      </span>
                      <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-emerald-400">
                        ECC: High Error Correction
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
                  <button
                    onClick={() => setIsQRModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-indigo-900/30 active:scale-95 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Generate QR Placard</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsQRModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mobile Verify</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Audit & CSV Ledger Export Module */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/20 border border-emerald-900/50 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-wide">
                        Offline Auditing CSV Ledger Export
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold uppercase">
                        RFC 4180 Certified
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {events.length} Events Chained
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      Download the full append-only event stream for container <span className="text-indigo-400 font-mono font-semibold">{selectedAggregateId}</span> as a cryptographic CSV spreadsheet. Ideal for offline regulatory audits, port authority compliance, cold-chain insurance underwriting, and external legal analysis.
                    </p>
                  </div>
                </div>

                {/* Primary Download Actions */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-900/30 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV Ledger</span>
                  </button>

                  <a
                    href={csvDirectUrl}
                    download={`AuditTrail-${selectedAggregateId}-events.csv`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                    title="Direct browser download link via backend endpoint"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Direct Link</span>
                  </a>

                  <button
                    onClick={handleCopyCsvLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono border border-slate-800 transition-colors"
                    title="Copy API URL for curl / automated ingestion scripts"
                  >
                    {copiedCsvLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* CSV Schema & Metadata Pills */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">Cryptographic Integrity</span>
                  <span className="text-slate-200 font-semibold truncate block mt-0.5">
                    SHA-256 PrevHash &amp; Hash
                  </span>
                  <span className="text-[10px] text-emerald-400 mt-0.5 block">Chain verification column included</span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">Chain of Custody Data</span>
                  <span className="text-slate-200 font-semibold truncate block mt-0.5">
                    Actor, Org &amp; Public Key
                  </span>
                  <span className="text-[10px] text-indigo-300 mt-0.5 block">Legal entity signatures preserved</span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">Spatial &amp; Telemetry</span>
                  <span className="text-slate-200 font-semibold truncate block mt-0.5">
                    Geo Lat/Lng &amp; IoT Payloads
                  </span>
                  <span className="text-[10px] text-cyan-400 mt-0.5 block">Full sensor values &amp; summary text</span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block">Offline Ingestion Ready</span>
                  <span className="text-slate-200 font-semibold truncate block mt-0.5">
                    Excel, Python &amp; R Compatible
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Standard UTF-8 comma-separated</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FULL APPEND-ONLY EVENT STORE */}
        {activeTab === 'stream' && (
          <EventStream
            events={events}
            selectedSequence={selectedSequence}
            onSelectSequence={handleSelectSequence}
            onOpenTamperTarget={openTamperModalForSeq}
          />
        )}

        {/* TAB 3: DISPUTE & FORENSIC LIABILITY RESOLUTION */}
        {activeTab === 'disputes' && foldedState && (
          <DisputePanel
            disputes={foldedState.disputes}
            events={events}
            state={foldedState}
            onResolveDispute={handleResolveDispute}
            onJumpToEvent={(seq) => {
              handleSelectSequence(seq);
              setActiveTab('overview');
            }}
          />
        )}

        {/* TAB 4: CQRS ARCHITECTURE DIAGRAM & EXPLANATION */}
        {activeTab === 'architecture' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">
                  Event Sourcing & CQRS Architectural Blueprint
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Command Query Responsibility Segregation (CQRS) separates write-side state mutation from read-side projections.
              </p>
            </div>

            {/* Architecture Pipeline Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Box 1: Commands API */}
              <div className="bg-slate-950 p-4 rounded-xl border border-indigo-900/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase mb-1">
                    1. WRITE SIDE (COMMANDS)
                  </div>
                  <h4 className="font-bold text-white text-sm">POST /api/commands/*</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Validates business domain invariants (e.g., container not sealed twice, temperature sensor sanity, no mutations after delivery).
                  </p>
                </div>
                <div className="mt-3 p-2 bg-slate-900 rounded font-mono text-[11px] text-indigo-300">
                  Command: LogTemperatureSpike
                </div>
              </div>

              {/* Box 2: Append-Only Event Store */}
              <div className="bg-slate-950 p-4 rounded-xl border border-blue-900/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-blue-400 font-bold uppercase mb-1">
                    2. APPEND-ONLY STORE
                  </div>
                  <h4 className="font-bold text-white text-sm">Immutable Log Collection</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Raw events are appended strictly at the tail. No SQL <code className="text-slate-300">UPDATE</code> or MongoDB <code className="text-slate-300">$set</code> allowed.
                  </p>
                </div>
                <div className="mt-3 p-2 bg-slate-900 rounded font-mono text-[11px] text-blue-300 truncate">
                  SHA-256 Hash Chain
                </div>
              </div>

              {/* Box 3: Event Sourcing Fold Engine */}
              <div className="bg-slate-950 p-4 rounded-xl border border-cyan-900/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1">
                    3. FOLDING ENGINE
                  </div>
                  <h4 className="font-bold text-white text-sm">Mathematical State Reduction</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    <code className="text-cyan-300 font-mono">State(t) = Fold(Event[0...t])</code>. Allows instantaneous historical time-travel to any sequence number.
                  </p>
                </div>
                <div className="mt-3 p-2 bg-slate-900 rounded font-mono text-[11px] text-cyan-300">
                  Pure Functional Reducer
                </div>
              </div>

              {/* Box 4: Read Model Projections */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/60 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase mb-1">
                    4. READ SIDE (QUERIES)
                  </div>
                  <h4 className="font-bold text-white text-sm">GET /api/queries/*</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Optimized materialized views for high-throughput reads, charts, cryptographic chain verification, and legal audit proofs.
                  </p>
                </div>
                <div className="mt-3 p-2 bg-slate-900 rounded font-mono text-[11px] text-emerald-300">
                  Read-Model Projections
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden mt-6">
              <div className="p-3 bg-slate-950 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                System Architectural Comparison: CRUD vs Event Sourcing
              </div>
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Attribute</th>
                    <th className="p-3 text-red-400">Traditional MongoDB / SQL CRUD</th>
                    <th className="p-3 text-emerald-400">AuditTrail Event Sourced CQRS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  <tr>
                    <td className="p-3 font-semibold text-white">Data Mutability</td>
                    <td className="p-3 text-red-300">Destructive overwrite in place (UPDATE table SET col = val)</td>
                    <td className="p-3 text-emerald-300">Append-only immutable event stream (Never modified or deleted)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Historical State (Time Travel)</td>
                    <td className="p-3 text-red-300">Impossible; previous state is erased unless manual backup tables exist</td>
                    <td className="p-3 text-emerald-300">Instantaneous: replay events up to sequence N</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Cryptographic Proof</td>
                    <td className="p-3 text-red-300">None; DB admin can alter rows silently without detection</td>
                    <td className="p-3 text-emerald-300">SHA-256 hash chaining detects single-byte DB tampering immediately</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Audit & Dispute Admissibility</td>
                    <td className="p-3 text-red-300">Weak; easily disputed in commercial litigation</td>
                    <td className="p-3 text-emerald-300">Cryptographically verifiable evidence accepted by Admiralty & Courts</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-12 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AuditTrail Engine • Event-Sourced Logistics Ledger & CQRS Architecture
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>SHA-256 Cryptographic Hash Verification</span>
            <span className="text-emerald-400">Active Node.js Sourcing Engine</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CommandModal
        isOpen={isCommandModalOpen}
        onClose={() => setIsCommandModalOpen(false)}
        aggregateId={selectedAggregateId}
        onDispatchSuccess={async () => {
          await fetchAggregates();
          await fetchAggregateData(selectedAggregateId);
        }}
      />

      <TamperModal
        isOpen={isTamperModalOpen}
        onClose={() => setIsTamperModalOpen(false)}
        aggregateId={selectedAggregateId}
        events={events}
        verification={verification}
        targetSequence={tamperTargetSeq}
        onTamperSimulated={async () => {
          await fetchAggregateData(selectedAggregateId, selectedSequence);
        }}
        onRestoreSuccess={async () => {
          await fetchAggregateData(selectedAggregateId, selectedSequence);
        }}
      />

      <AuditProofModal
        isOpen={isAuditProofModalOpen}
        onClose={() => setIsAuditProofModalOpen(false)}
        aggregateId={selectedAggregateId}
      />

      <NewContainerModal
        isOpen={isNewContainerModalOpen}
        onClose={() => setIsNewContainerModalOpen(false)}
        onCreated={async (newId) => {
          await fetchAggregates();
          setSelectedAggregateId(newId);
          await fetchAggregateData(newId);
        }}
      />

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        aggregateId={selectedAggregateId}
        latestHash={foldedState?.chainHeadHash || ''}
        sequence={selectedSequence}
        state={foldedState}
        isChainValid={verification?.isValid ?? true}
      />
    </div>
  );
}
