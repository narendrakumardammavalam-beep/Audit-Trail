import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  X,
  Download,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Building,
  Calendar,
  Lock,
  Layers,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface AuditProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateId: string;
}

export const AuditProofModal: React.FC<AuditProofModalProps> = ({
  isOpen,
  onClose,
  aggregateId,
}) => {
  const [proofData, setProofData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch(`/api/queries/audit-proof/${aggregateId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProofData(data.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, aggregateId]);

  if (!isOpen) return null;

  const downloadJSON = () => {
    if (!proofData) return;
    const blob = new Blob([JSON.stringify(proofData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AuditTrail-Proof-${aggregateId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto print:bg-white print:text-black print:border-none print:shadow-none">
        {/* Header / Actions */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-white">Cryptographic Legal Audit Proof</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading || !proofData ? (
          <div className="py-16 text-center text-slate-400 text-sm font-mono animate-pulse">
            Generating cryptographic proof package...
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {/* Certificate Header Banner */}
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-mono font-semibold mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                VERIFIED IMMUTABLE LOGISTICS DOSSIER
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                Certificate of Cold-Chain Custody & Invariant Audit
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Issued by AuditTrail Sourcing Engine • Regulated Maritime & Biopharmaceutical Compliance
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-900 text-xs font-mono text-left">
                <div>
                  <span className="text-slate-500 block text-[10px]">CONTAINER ID</span>
                  <span className="text-white font-bold">{proofData.aggregateId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">TOTAL EVENTS</span>
                  <span className="text-white font-bold">{proofData.eventCount}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">CARGO VALUATION</span>
                  <span className="text-white font-bold">${proofData.totalCargoValueUSD.toLocaleString()} USD</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">HASHING ALGORITHM</span>
                  <span className="text-emerald-400 font-bold">SHA-256 (Merkle Chained)</span>
                </div>
              </div>
            </div>

            {/* Cryptographic Digests */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Cryptographic Anchor Hashes
              </div>
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 bg-slate-900/60 p-2 rounded">
                  <span className="text-slate-500 text-[10px]">GENESIS HASH (Root):</span>
                  <span className="text-slate-300 truncate max-w-md">{proofData.cryptographicProof.genesisHash}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 bg-slate-900/60 p-2 rounded">
                  <span className="text-slate-500 text-[10px]">CHAIN HEAD HASH (Tail):</span>
                  <span className="text-indigo-300 font-bold truncate max-w-md">{proofData.cryptographicProof.headHash}</span>
                </div>
              </div>
            </div>

            {/* Chain of Custody Lineage */}
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-400" /> Complete Chronological Custody Lineage
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Organization</th>
                      <th className="p-2.5">Signatory</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5">Timestamp (UTC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {proofData.custodyLineage.map((item: any) => (
                      <tr key={item.sequence} className="hover:bg-slate-950/40">
                        <td className="p-2.5 font-bold text-indigo-400">#{item.sequence}</td>
                        <td className="p-2.5 text-white font-semibold">{item.actor.organization}</td>
                        <td className="p-2.5 text-slate-400">{item.actor.name} ({item.actor.role})</td>
                        <td className="p-2.5">{item.location.locationName}</td>
                        <td className="p-2.5 text-slate-400">{new Date(item.timestamp).toUTCString().slice(0, 22)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Anomalies & Excursions for Legal Arbitration */}
            {proofData.anomalies.length > 0 && (
              <div className="p-4 bg-rose-950/30 border border-rose-900/60 rounded-xl space-y-3">
                <h4 className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Recorded Invariant Violations & Excursion Incidents
                </h4>
                {proofData.anomalies.map((ano: any, idx: number) => (
                  <div key={idx} className="bg-slate-950/80 p-3 rounded-lg border border-rose-900/40 text-xs font-mono">
                    <div className="flex items-center justify-between text-rose-400 font-bold mb-1">
                      <span>Event #{ano.sequence}: {ano.eventType}</span>
                      <span>{new Date(ano.timestamp).toUTCString()}</span>
                    </div>
                    <div className="text-slate-300">
                      Custodian Holding Legal Possession: <strong className="text-white">{ano.responsibleCustodian}</strong>
                    </div>
                    <div className="text-slate-400 mt-1">
                      Location: {ano.location} | Details: {JSON.stringify(ano.details)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Official Signature Footprint */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
              <div>Certified Digital Hash: SHA256-ED25519-COMPLIANT</div>
              <div>Generated: {new Date(proofData.generatedAt).toUTCString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
