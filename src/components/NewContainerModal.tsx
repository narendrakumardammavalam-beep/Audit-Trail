import React, { useState } from 'react';
import { Plus, X, Package, Shield, Thermometer } from 'lucide-react';

interface NewContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newId: string) => void;
}

export const NewContainerModal: React.FC<NewContainerModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [containerId, setContainerId] = useState(`CONT-LOG-${Math.floor(1000 + Math.random() * 9000)}`);
  const [title, setTitle] = useState('Critical Biologics & Cellular Therapies Reefer');
  const [origin, setOrigin] = useState('Basel Pharma Campus, Switzerland');
  const [destination, setDestination] = useState('Johns Hopkins Hospital, Baltimore, USA');
  const [minTemp, setMinTemp] = useState('2.0');
  const [maxTemp, setMaxTemp] = useState('8.0');
  const [initialTemp, setInitialTemp] = useState('4.2');
  const [cargoSku, setCargoSku] = useState('BIO-CELL-X9');
  const [cargoName, setCargoName] = useState('Autologous Chimeric CAR-T Cell Vials');
  const [cargoQty, setCargoQty] = useState('1200');
  const [cargoValueUSD, setCargoValueUSD] = useState('450');
  const [officerName, setOfficerName] = useState('Dr. Claudia Meier');
  const [officerOrg, setOfficerOrg] = useState('Novartis CryoLogistics');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const actor = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      name: officerName,
      role: 'Global Cold-Chain Director',
      organization: officerOrg,
      publicKey: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
    };

    try {
      // Step 1: Create Container Event
      const createRes = await fetch('/api/commands/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateId: containerId,
          aggregateType: 'SHIPPING_CONTAINER',
          eventType: 'CONTAINER_CREATED',
          actor,
          payload: {
            title,
            origin,
            destination,
            initialTemperature: parseFloat(initialTemp),
            temperatureTarget: {
              min: parseFloat(minTemp),
              max: parseFloat(maxTemp),
              unit: '°C',
            },
          },
          metadata: {
            geo: { lat: 47.5596, lng: 7.5886, locationName: origin },
            notes: 'Genesis container initialization. Certified cold chain engaged.',
          },
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || 'Failed to initialize container');
      }

      // Step 2: Load Cargo Manifest Event
      await fetch('/api/commands/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateId: containerId,
          aggregateType: 'SHIPPING_CONTAINER',
          eventType: 'INVENTORY_LOADED',
          actor,
          payload: {
            items: [
              {
                sku: cargoSku,
                name: cargoName,
                quantity: parseInt(cargoQty, 10),
                unit: 'units',
                batchNumber: `LOT-2026-${Math.floor(100 + Math.random() * 900)}`,
                valueUSD: parseFloat(cargoValueUSD),
                temperatureRequired: { min: parseFloat(minTemp), max: parseFloat(maxTemp), unit: '°C' },
              },
            ],
          },
          metadata: {
            geo: { lat: 47.5596, lng: 7.5886, locationName: origin },
            notes: 'Initial inventory consignment securely stowed.',
          },
        }),
      });

      // Step 3: Affix Seal
      await fetch('/api/commands/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateId: containerId,
          aggregateType: 'SHIPPING_CONTAINER',
          eventType: 'SEAL_AFFIXED',
          actor,
          payload: {
            sealNumber: `SEAL-${Math.floor(10000 + Math.random() * 90000)}-ISO`,
            lockMechanism: 'Electronic Tamper-Evident RFID Bolt',
          },
          metadata: {
            geo: { lat: 47.5596, lng: 7.5886, locationName: origin },
          },
        }),
      });

      onCreated(containerId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Initialize New Logistics Aggregate</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-red-950/80 border border-red-800 rounded-lg text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-mono mb-1">Aggregate Container ID</label>
            <input
              type="text"
              value={containerId}
              onChange={(e) => setContainerId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-mono mb-1">Consignment Title / Description</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 font-mono mb-1">Origin Point</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1">Destination Point</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
              />
            </div>
          </div>

          {/* Temperature Range */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5" /> Cold-Chain Invariant Thresholds
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block">Min Allowed (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={minTemp}
                  onChange={(e) => setMinTemp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono block">Max Allowed (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxTemp}
                  onChange={(e) => setMaxTemp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-mono block">Initial Temp (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={initialTemp}
                  onChange={(e) => setInitialTemp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cargo Manifest */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-slate-400 font-mono block mb-1">SKU</label>
              <input
                type="text"
                value={cargoSku}
                onChange={(e) => setCargoSku(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Quantity</label>
              <input
                type="number"
                value={cargoQty}
                onChange={(e) => setCargoQty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-mono block mb-1">Unit Value ($)</label>
              <input
                type="number"
                value={cargoValueUSD}
                onChange={(e) => setCargoValueUSD(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-md active:scale-95 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Creating Genesis Block...' : 'Initialize & Fold'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
