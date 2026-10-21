import React, { useState } from 'react';
import { EventType, Actor } from '../types/ledger';
import { Send, X, AlertCircle, ShieldCheck, Check, Sparkles } from 'lucide-react';

interface CommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  aggregateId: string;
  onDispatchSuccess: () => void;
}

export const CommandModal: React.FC<CommandModalProps> = ({
  isOpen,
  onClose,
  aggregateId,
  onDispatchSuccess,
}) => {
  const [eventType, setEventType] = useState<EventType>('TEMPERATURE_LOGGED');
  const [actorName, setActorName] = useState('Sarah Chen');
  const [actorOrg, setActorOrg] = useState('EuroTrans Cold Logistics');
  const [actorRole, setActorRole] = useState('Fleet Operations Lead');

  // Payload fields
  const [temperature, setTemperature] = useState('-19.5');
  const [humidity, setHumidity] = useState('52');
  const [locationName, setLocationName] = useState('Rotterdam Inland Transit Terminal');
  const [lat, setLat] = useState('51.9244');
  const [lng, setLng] = useState('4.4777');
  const [notes, setNotes] = useState('Nominal IoT sensor scheduled burst telemetry transmission.');

  // For custody transfer
  const [newOrg, setNewOrg] = useState('Rotterdam Cold Storage B.V.');
  const [transferType, setTransferType] = useState('Quayside Truck Handoff');

  // For dispute
  const [claimAmount, setClaimAmount] = useState('250000');
  const [disputeReason, setDisputeReason] = useState('Thermal shock damage detected on arrival.');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    let payload: Record<string, any> = {};

    if (eventType === 'TEMPERATURE_LOGGED') {
      payload = {
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        compressorStatus: 'NOMINAL',
      };
    } else if (eventType === 'TEMPERATURE_SPIKE') {
      payload = {
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        cause: 'REEFER_COMPRESSOR_TRIP',
        durationMinutes: 90,
        alertLevel: 'SEVERITY_1_CRITICAL',
        spoiledUnits: 600,
      };
    } else if (eventType === 'CUSTODY_TRANSFERRED') {
      payload = {
        previousCustodian: actorOrg,
        newCustodian: newOrg,
        transferType,
        verifiedBy: actorName,
      };
    } else if (eventType === 'CUSTOMS_INSPECTED') {
      payload = {
        inspectorName: actorName,
        status: 'CLEARED',
        sealStatus: 'INTACT',
        physicalInspection: 'PASSED',
        sealReplaced: true,
        newSealNumber: `SEAL-NL-CUST-${Date.now().toString().slice(-5)}`,
      };
    } else if (eventType === 'DISPUTE_FILED') {
      payload = {
        disputeId: `DISP-${Date.now().toString().slice(-4)}`,
        claimant: actorOrg,
        respondent: 'Pacific & Atlantic SeaLines',
        claimAmountUSD: parseFloat(claimAmount),
        reason: disputeReason,
      };
    } else if (eventType === 'FINAL_DELIVERED') {
      payload = {
        consignee: 'Erasmus Medical Centre Pharmacy Hub',
        acceptedBy: actorName,
        signatureVerified: true,
      };
    }

    const commandBody = {
      aggregateId,
      aggregateType: 'SHIPPING_CONTAINER',
      eventType,
      actor: {
        id: `ACT-${Date.now().toString().slice(-4)}`,
        name: actorName,
        role: actorRole,
        organization: actorOrg,
        publicKey: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      },
      payload,
      metadata: {
        geo: {
          lat: parseFloat(lat) || 0,
          lng: parseFloat(lng) || 0,
          locationName,
        },
        notes,
      },
    };

    try {
      const res = await fetch('/api/commands/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandBody),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch command');
      }

      onDispatchSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                CQRS Write Side
              </span>
              <h3 className="text-lg font-bold text-white">Dispatch Command</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Appends an immutable cryptographic event to aggregate <span className="font-mono text-indigo-300 font-bold">{aggregateId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-700 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Command Event Type */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
              Command Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            >
              <option value="TEMPERATURE_LOGGED">TEMPERATURE_LOGGED (Sensor Telemetry)</option>
              <option value="TEMPERATURE_SPIKE">TEMPERATURE_SPIKE (Simulate Refrigeration Failure)</option>
              <option value="CUSTODY_TRANSFERRED">CUSTODY_TRANSFERRED (Handover Chain of Custody)</option>
              <option value="CUSTOMS_INSPECTED">CUSTOMS_INSPECTED (Border Inspection & Clearance)</option>
              <option value="DISPUTE_FILED">DISPUTE_FILED (Formal Financial Liability Claim)</option>
              <option value="FINAL_DELIVERED">FINAL_DELIVERED (Final Consignee Receipt)</option>
            </select>
          </div>

          {/* Actor Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Actor Name</label>
              <input
                type="text"
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Organization</label>
              <input
                type="text"
                value={actorOrg}
                onChange={(e) => setActorOrg(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Role</label>
              <input
                type="text"
                value={actorRole}
                onChange={(e) => setActorRole(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Dynamic Payload Specifics */}
          {(eventType === 'TEMPERATURE_LOGGED' || eventType === 'TEMPERATURE_SPIKE') && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <span className="text-[11px] font-mono uppercase text-indigo-400 block font-semibold">
                Sensor Telemetry Inputs
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Humidity (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={humidity}
                    onChange={(e) => setHumidity(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {eventType === 'CUSTODY_TRANSFERRED' && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <span className="text-[11px] font-mono uppercase text-indigo-400 block font-semibold">
                Custody Handoff Details
              </span>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Receiving Organization</label>
                <input
                  type="text"
                  value={newOrg}
                  onChange={(e) => setNewOrg(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}

          {eventType === 'DISPUTE_FILED' && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <span className="text-[11px] font-mono uppercase text-rose-400 block font-semibold">
                Dispute Claim Details
              </span>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Claim Amount ($ USD)</label>
                <input
                  type="number"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Dispute Reason / Claim</label>
                <input
                  type="text"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Location & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Current Location Name</label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Coordinates (Lat, Lng)</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                  placeholder="Lat"
                />
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                  placeholder="Lng"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Audit Notes / Signature Annotation</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Appending & Hashing...' : 'Dispatch & Append Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
