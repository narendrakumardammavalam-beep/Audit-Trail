import crypto from 'crypto';
import {
  LedgerEvent,
  AggregateState,
  LedgerVerificationResult,
  TelemetryPoint,
  EventType,
  Actor
} from '../src/types/ledger';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function calculateEventHash(event: Omit<LedgerEvent, 'hash'>): string {
  const payloadStr = JSON.stringify(event.payload, Object.keys(event.payload || {}).sort());
  const data = `${event.sequence}|${event.previousHash}|${event.timestamp}|${event.aggregateId}|${event.eventType}|${payloadStr}|${event.actor.id}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// In-Memory Event Store (Append-Only Collection)
let eventStore: LedgerEvent[] = [];
let globalSeqCounter = 1;

export function getEventsForAggregate(aggregateId: string): LedgerEvent[] {
  return eventStore
    .filter((e) => e.aggregateId === aggregateId)
    .sort((a, b) => a.sequence - b.sequence);
}

export function getAllAggregatesList(): {
  aggregateId: string;
  aggregateType: string;
  title: string;
  eventsCount: number;
  status: string;
  hasDispute: boolean;
  tampered: boolean;
  currentTemp: number;
}[] {
  const ids = Array.from(new Set(eventStore.map((e) => e.aggregateId)));
  return ids.map((id) => {
    const events = getEventsForAggregate(id);
    const state = foldEvents(events);
    const isTampered = events.some((e) => e.tampered);
    return {
      aggregateId: id,
      aggregateType: state.aggregateType,
      title: state.title,
      eventsCount: events.length,
      status: state.status,
      hasDispute: state.disputes.some((d) => d.status === 'OPEN' || d.status === 'INVESTIGATING'),
      tampered: isTampered,
      currentTemp: state.telemetry.currentTemperature,
    };
  });
}

/**
 * Event Sourcing Fold Engine (Mathematical Reduction of Events)
 * Reconstructs state at any historical sequence.
 */
export function foldEvents(events: LedgerEvent[], upToSequence?: number): AggregateState {
  const targetEvents = upToSequence !== undefined
    ? events.filter((e) => e.sequence <= upToSequence)
    : events;

  // Initial Blank State
  const state: AggregateState = {
    aggregateId: events[0]?.aggregateId || 'UNKNOWN',
    aggregateType: events[0]?.aggregateType || 'SHIPPING_CONTAINER',
    version: 0,
    totalEventsCount: targetEvents.length,
    createdAt: targetEvents[0]?.timestamp || new Date().toISOString(),
    lastUpdatedAt: targetEvents[targetEvents.length - 1]?.timestamp || new Date().toISOString(),
    title: 'Uninitialized Container',
    origin: 'Unknown',
    destination: 'Unknown',
    status: 'INITIALIZED',
    currentLocation: { lat: 0, lng: 0, locationName: 'Unassigned' },
    currentCustodian: {
      id: 'SYSTEM',
      name: 'System Root',
      role: 'Automated Ledger',
      organization: 'AuditTrail Network',
      publicKey: '0x00',
    },
    sealInfo: {
      sealNumber: 'NONE',
      isIntact: true,
      tamperDetected: false,
    },
    telemetry: {
      temperatureTarget: { min: 2.0, max: 8.0, unit: '°C' },
      currentTemperature: 4.0,
      currentHumidity: 55.0,
      minRecordedTemp: 4.0,
      maxRecordedTemp: 4.0,
      spikeIncidentsCount: 0,
      powerLossIncidentsCount: 0,
      isCurrentlyExcursion: false,
    },
    cargoManifest: [],
    totalCargoValueUSD: 0,
    spoiledItemsCount: 0,
    disputes: [],
    chainHeadHash: GENESIS_HASH,
  };

  if (targetEvents.length === 0) return state;

  for (const evt of targetEvents) {
    state.version = evt.sequence;
    state.lastUpdatedAt = evt.timestamp;
    state.chainHeadHash = evt.hash;

    switch (evt.eventType) {
      case 'CONTAINER_CREATED': {
        state.title = evt.payload.title || state.title;
        state.origin = evt.payload.origin || state.origin;
        state.destination = evt.payload.destination || state.destination;
        state.currentLocation = evt.metadata.geo || state.currentLocation;
        state.currentCustodian = evt.actor;
        if (evt.payload.temperatureTarget) {
          state.telemetry.temperatureTarget = evt.payload.temperatureTarget;
          state.telemetry.currentTemperature = evt.payload.initialTemperature ?? evt.payload.temperatureTarget.min;
          state.telemetry.minRecordedTemp = state.telemetry.currentTemperature;
          state.telemetry.maxRecordedTemp = state.telemetry.currentTemperature;
        }
        state.status = 'INITIALIZED';
        break;
      }

      case 'SEAL_AFFIXED': {
        state.sealInfo = {
          sealNumber: evt.payload.sealNumber,
          affixedAt: evt.timestamp,
          isIntact: true,
          tamperDetected: false,
        };
        break;
      }

      case 'INVENTORY_LOADED': {
        if (Array.isArray(evt.payload.items)) {
          state.cargoManifest = evt.payload.items;
          state.totalCargoValueUSD = evt.payload.items.reduce(
            (acc: number, item: any) => acc + (item.quantity * item.valueUSD),
            0
          );
        }
        break;
      }

      case 'LOADED_ON_VESSEL': {
        state.vesselInfo = {
          name: evt.payload.vesselName,
          voyageId: evt.payload.voyageId,
          carrier: evt.payload.carrier,
        };
        state.status = 'AT_SEA';
        state.currentLocation = evt.metadata.geo;
        state.currentCustodian = evt.actor;
        break;
      }

      case 'VESSEL_DEPARTED': {
        state.status = 'IN_TRANSIT';
        state.currentLocation = evt.metadata.geo;
        break;
      }

      case 'TEMPERATURE_LOGGED': {
        const temp = Number(evt.payload.temperature);
        const hum = Number(evt.payload.humidity ?? state.telemetry.currentHumidity);
        state.telemetry.currentTemperature = temp;
        state.telemetry.currentHumidity = hum;
        if (temp < state.telemetry.minRecordedTemp) state.telemetry.minRecordedTemp = temp;
        if (temp > state.telemetry.maxRecordedTemp) state.telemetry.maxRecordedTemp = temp;
        
        const isExcursion = temp < state.telemetry.temperatureTarget.min || temp > state.telemetry.temperatureTarget.max;
        state.telemetry.isCurrentlyExcursion = isExcursion;
        state.currentLocation = evt.metadata.geo;
        break;
      }

      case 'TEMPERATURE_SPIKE': {
        const spikeTemp = Number(evt.payload.temperature);
        state.telemetry.currentTemperature = spikeTemp;
        if (spikeTemp > state.telemetry.maxRecordedTemp) state.telemetry.maxRecordedTemp = spikeTemp;
        state.telemetry.spikeIncidentsCount += 1;
        state.telemetry.isCurrentlyExcursion = true;
        state.currentLocation = evt.metadata.geo;
        if (evt.payload.cause === 'REEFER_POWER_LOSS') {
          state.telemetry.powerLossIncidentsCount += 1;
        }
        if (evt.payload.spoiledUnits) {
          state.spoiledItemsCount += Number(evt.payload.spoiledUnits);
        }
        break;
      }

      case 'REEFER_POWER_RESTORED': {
        state.telemetry.isCurrentlyExcursion = false;
        if (evt.payload.stabilizedTemperature !== undefined) {
          state.telemetry.currentTemperature = Number(evt.payload.stabilizedTemperature);
        }
        break;
      }

      case 'CUSTODY_TRANSFERRED': {
        state.currentCustodian = evt.actor;
        state.currentLocation = evt.metadata.geo;
        break;
      }

      case 'PORT_CHECKPOINT_CLEARED': {
        state.status = 'AT_PORT';
        state.currentLocation = evt.metadata.geo;
        break;
      }

      case 'CUSTOMS_INSPECTED': {
        if (evt.payload.status === 'HOLD') {
          state.status = 'CUSTOMS_HOLD';
        } else if (evt.payload.status === 'CLEARED') {
          state.status = 'AT_PORT';
        }
        if (evt.payload.sealReplaced) {
          state.sealInfo.sealNumber = evt.payload.newSealNumber;
          state.sealInfo.isIntact = true;
        }
        state.currentLocation = evt.metadata.geo;
        break;
      }

      case 'CONTAINER_DISCHARGED': {
        state.status = 'AT_PORT';
        state.currentLocation = evt.metadata.geo;
        break;
      }

      case 'INVENTORY_ADJUSTED': {
        const { sku, deltaQuantity, reason } = evt.payload;
        const item = state.cargoManifest.find((i) => i.sku === sku);
        if (item) {
          item.quantity += deltaQuantity;
          if (reason === 'SPOILAGE_DISCARD') {
            state.spoiledItemsCount += Math.abs(deltaQuantity);
          }
        }
        state.totalCargoValueUSD = state.cargoManifest.reduce(
          (acc, item) => acc + (item.quantity * item.valueUSD),
          0
        );
        break;
      }

      case 'SPOILAGE_FLAGGED': {
        state.spoiledItemsCount += Number(evt.payload.spoiledUnits || 0);
        state.status = 'QUARANTINED';
        break;
      }

      case 'DISPUTE_FILED': {
        state.status = 'DISPUTED';
        state.disputes.push({
          id: evt.payload.disputeId || `DISP-${evt.sequence}`,
          openedAt: evt.timestamp,
          claimant: evt.payload.claimant,
          respondent: evt.payload.respondent,
          claimAmountUSD: Number(evt.payload.claimAmountUSD || 0),
          reason: evt.payload.reason,
          status: 'OPEN',
          culpritEventSequence: evt.payload.culpritEventSequence,
          culpritCustodian: evt.payload.culpritCustodian,
        });
        break;
      }

      case 'DISPUTE_RESOLVED': {
        const dispute = state.disputes.find((d) => d.id === evt.payload.disputeId);
        if (dispute) {
          dispute.status = 'SETTLED';
          dispute.resolution = evt.payload.resolution;
          dispute.resolvedAt = evt.timestamp;
        }
        // If all disputes settled, change status to DELIVERED or AT_PORT
        if (state.disputes.every((d) => d.status === 'SETTLED')) {
          state.status = 'DELIVERED';
        }
        break;
      }

      case 'FINAL_DELIVERED': {
        state.status = 'DELIVERED';
        state.currentCustodian = evt.actor;
        state.currentLocation = evt.metadata.geo;
        break;
      }
    }
  }

  return state;
}

/**
 * Cryptographic Ledger Verifier
 * Validates the strict SHA-256 hash chaining of every event from Genesis to Head.
 */
export function verifyChainIntegrity(events: LedgerEvent[]): LedgerVerificationResult {
  if (events.length === 0) {
    return {
      aggregateId: '',
      isValid: true,
      totalEventsChecked: 0,
      genesisHash: GENESIS_HASH,
      headHash: GENESIS_HASH,
      timestamp: new Date().toISOString(),
      verificationMessage: 'Ledger is empty. Cryptographic root initialized.',
    };
  }

  const aggregateId = events[0].aggregateId;

  for (let i = 0; i < events.length; i++) {
    const current = events[i];
    const prev = i > 0 ? events[i - 1] : null;

    // Check 1: Previous hash link
    const expectedPrevHash = prev ? prev.hash : GENESIS_HASH;
    if (current.previousHash !== expectedPrevHash) {
      return {
        aggregateId,
        isValid: false,
        totalEventsChecked: i + 1,
        genesisHash: events[0].hash,
        headHash: events[events.length - 1].hash,
        brokenLinkIndex: current.sequence,
        tamperedEventId: current.id,
        expectedHash: expectedPrevHash,
        actualHash: current.previousHash,
        timestamp: new Date().toISOString(),
        verificationMessage: `Cryptographic link broken at event #${current.sequence} (${current.eventType}). Previous hash mismatch detected!`,
      };
    }

    // Check 2: Content integrity hash
    const recomputedHash = calculateEventHash(current);
    if (recomputedHash !== current.hash) {
      return {
        aggregateId,
        isValid: false,
        totalEventsChecked: i + 1,
        genesisHash: events[0].hash,
        headHash: events[events.length - 1].hash,
        brokenLinkIndex: current.sequence,
        tamperedEventId: current.id,
        expectedHash: current.hash,
        actualHash: recomputedHash,
        timestamp: new Date().toISOString(),
        verificationMessage: `Tamper detected in event #${current.sequence} (${current.eventType})! The stored cryptographic signature does not match the re-hashed payload content.`,
      };
    }
  }

  return {
    aggregateId,
    isValid: true,
    totalEventsChecked: events.length,
    genesisHash: events[0].hash,
    headHash: events[events.length - 1].hash,
    timestamp: new Date().toISOString(),
    verificationMessage: `Verified 100% immutable. All ${events.length} chronological events match their cryptographic SHA-256 signatures. Zero tampering detected.`,
  };
}

/**
 * Extracts telemetry time series for Recharts
 */
export function extractTelemetry(events: LedgerEvent[]): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  let currentMin = 2.0;
  let currentMax = 8.0;

  for (const evt of events) {
    if (evt.payload.temperatureTarget) {
      currentMin = evt.payload.temperatureTarget.min;
      currentMax = evt.payload.temperatureTarget.max;
    }

    let temp = evt.payload.temperature ?? (evt.payload.initialTemperature ?? null);
    let hum = evt.payload.humidity ?? 55;

    if (temp !== null) {
      const isSpike = evt.eventType === 'TEMPERATURE_SPIKE' || temp < currentMin || temp > currentMax;
      const date = new Date(evt.timestamp);
      const timeLabel = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      points.push({
        sequence: evt.sequence,
        timestamp: evt.timestamp,
        timeLabel,
        temperature: Number(temp),
        humidity: Number(hum),
        minThreshold: currentMin,
        maxThreshold: currentMax,
        isSpike,
        isPowerLoss: evt.payload.cause === 'REEFER_POWER_LOSS',
        eventType: evt.eventType,
        eventTitle: evt.eventType.replace(/_/g, ' '),
        locationName: evt.metadata.geo.locationName,
        custodianOrg: evt.actor.organization,
      });
    }
  }

  return points;
}

/**
 * Command Handler (Append-Only Event Creation)
 */
export function appendEventToStore(params: {
  aggregateId: string;
  aggregateType: 'SHIPPING_CONTAINER' | 'INVENTORY_LOT';
  eventType: EventType;
  actor: Actor;
  payload: Record<string, any>;
  metadata: {
    ip?: string;
    deviceId?: string;
    sensorModel?: string;
    geo: { lat: number; lng: number; locationName: string };
    notes?: string;
  };
}): LedgerEvent {
  const existingEvents = getEventsForAggregate(params.aggregateId);
  const sequence = existingEvents.length + 1;
  const previousHash = existingEvents.length > 0 ? existingEvents[existingEvents.length - 1].hash : GENESIS_HASH;

  const eventDraft: Omit<LedgerEvent, 'hash'> = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sequence,
    globalSequence: globalSeqCounter++,
    aggregateId: params.aggregateId,
    aggregateType: params.aggregateType,
    eventType: params.eventType,
    timestamp: new Date().toISOString(),
    actor: params.actor,
    payload: params.payload,
    metadata: {
      ip: params.metadata.ip || '192.168.1.104',
      deviceId: params.metadata.deviceId || 'IoT-SENSOR-EDGE-40',
      sensorModel: params.metadata.sensorModel || 'Sensitech ColdChain Probe v4',
      geo: params.metadata.geo,
      notes: params.metadata.notes,
    },
    previousHash,
  };

  const hash = calculateEventHash(eventDraft);
  const newEvent: LedgerEvent = {
    ...eventDraft,
    hash,
  };

  eventStore.push(newEvent);
  return newEvent;
}

/**
 * Tamper Simulation (Demonstrating Cryptographic Immutability Failure)
 */
export function simulateTamper(aggregateId: string, targetSequence: number, alteredField: string, maliciousValue: any) {
  const events = getEventsForAggregate(aggregateId);
  const target = events.find((e) => e.sequence === targetSequence);
  if (!target) return { success: false, message: 'Event not found' };

  if (!target.originalPayloadForSimulation) {
    target.originalPayloadForSimulation = JSON.parse(JSON.stringify(target.payload));
  }

  target.payload[alteredField] = maliciousValue;
  target.tampered = true;

  return {
    success: true,
    message: `Malicious edit injected at event #${targetSequence}. Payload field '${alteredField}' forged to '${maliciousValue}'. Cryptographic signature was NOT updated to simulate raw DB breach!`,
    targetEvent: target,
  };
}

export function restoreIntegrity(aggregateId: string) {
  const events = getEventsForAggregate(aggregateId);
  for (const evt of events) {
    if (evt.tampered && evt.originalPayloadForSimulation) {
      evt.payload = JSON.parse(JSON.stringify(evt.originalPayloadForSimulation));
      delete evt.originalPayloadForSimulation;
      delete evt.tampered;
    }
  }
  return { success: true, message: 'Ledger integrity restored to verified cryptographic baseline.' };
}

/**
 * Seed Datasets
 */
export function seedInitialLedger() {
  eventStore = [];
  globalSeqCounter = 1;

  // --- AGGREGATE 1: CONT-BIO-8921 (mRNA Vaccines Cold Chain Dispute) ---
  const container1 = 'CONT-BIO-8921';
  const c1ActorPharma: Actor = {
    id: 'ACT-PHARMA-01',
    name: 'Dr. Evelyn Vance',
    role: 'Quality Assurance Director',
    organization: 'BioVax BioPharma GmbH',
    publicKey: '0x9b4a...c712',
  };
  const c1ActorLogistics: Actor = {
    id: 'ACT-LOG-04',
    name: 'Marco Rossi',
    role: 'Cold-Chain Dispatch Specialist',
    organization: 'EuroTrans Cold Logistics',
    publicKey: '0x3f12...e890',
  };
  const c1ActorCarrier: Actor = {
    id: 'ACT-SHIP-09',
    name: 'Captain Lars Nielsen',
    role: 'Chief Vessel Officer',
    organization: 'Pacific & Atlantic SeaLines',
    publicKey: '0x7a88...411f',
  };
  const c1ActorCustoms: Actor = {
    id: 'ACT-CUST-22',
    name: 'Officer Jan Vermeer',
    role: 'Border Inspection Official',
    organization: 'Rotterdam Port Customs Authority',
    publicKey: '0x1c44...dd59',
  };

  const c1Events: Array<{
    eventType: EventType;
    actor: Actor;
    timestamp: string;
    payload: any;
    geo: { lat: number; lng: number; locationName: string };
    notes?: string;
  }> = [
    {
      eventType: 'CONTAINER_CREATED',
      actor: c1ActorPharma,
      timestamp: '2026-10-14T08:00:00.000Z',
      payload: {
        title: 'mRNA BioTherapeutics Ultra-Cold Reefer Unit #8921',
        origin: 'BioVax Campus, Marburg, Germany',
        destination: 'BioMedical Distribution Hub, Rotterdam, Netherlands',
        initialTemperature: -20.5,
        temperatureTarget: { min: -25.0, max: -15.0, unit: '°C' },
      },
      geo: { lat: 50.8021, lng: 8.7667, locationName: 'BioVax Manufacturing Plant, Marburg' },
      notes: 'Calibrated CryoReefer active refrigeration engaged. Pre-cooling verified.',
    },
    {
      eventType: 'INVENTORY_LOADED',
      actor: c1ActorPharma,
      timestamp: '2026-10-14T09:15:00.000Z',
      payload: {
        items: [
          {
            sku: 'VAX-MRNA-B12',
            name: 'mRNA Specialized Oncology Therapy Vials',
            quantity: 2400,
            unit: 'vials',
            batchNumber: 'LOT-2026-OCT-88',
            valueUSD: 175,
            temperatureRequired: { min: -25.0, max: -15.0, unit: '°C' },
          },
        ],
      },
      geo: { lat: 50.8021, lng: 8.7667, locationName: 'Cleanroom Cryo-Bay 4, Marburg' },
      notes: 'Cargo loaded in sterile ISO 5 cleanroom. Total cargo value: $420,000.',
    },
    {
      eventType: 'SEAL_AFFIXED',
      actor: c1ActorPharma,
      timestamp: '2026-10-14T09:45:00.000Z',
      payload: {
        sealNumber: 'SEAL-BIO-99482-CRY',
        electronicRfidId: 'RFID-SEC-492019',
        lockMechanism: 'High-Tensile Barcode Cable Bolt Seal',
      },
      geo: { lat: 50.8021, lng: 8.7667, locationName: 'BioVax Loading Bay A' },
      notes: 'Tamper-evident cryptographic barcode seal clamped and verified intact.',
    },
    {
      eventType: 'CUSTODY_TRANSFERRED',
      actor: c1ActorLogistics,
      timestamp: '2026-10-14T11:00:00.000Z',
      payload: {
        previousCustodian: c1ActorPharma.organization,
        newCustodian: c1ActorLogistics.organization,
        transferType: 'Road Freight Intermodal Pickup',
        truckRegistration: 'HE-CT-8902',
      },
      geo: { lat: 50.8021, lng: 8.7667, locationName: 'BioVax Dispatch Gate 2' },
      notes: 'Driver verified temperature: -20.2°C. Custody legally acknowledged.',
    },
    {
      eventType: 'TEMPERATURE_LOGGED',
      actor: c1ActorLogistics,
      timestamp: '2026-10-14T14:30:00.000Z',
      payload: {
        temperature: -19.8,
        humidity: 48.0,
        compressorStatus: 'NOMINAL',
        powerSource: 'Reefer Diesel GenSet #1',
      },
      geo: { lat: 51.2277, lng: 6.7735, locationName: 'Autobahn A3 Corridor near Düsseldorf' },
      notes: 'Mid-route telemetry handshake OK.',
    },
    {
      eventType: 'LOADED_ON_VESSEL',
      actor: c1ActorCarrier,
      timestamp: '2026-10-15T02:00:00.000Z',
      payload: {
        vesselName: 'M/V Rhine Feeder Express',
        voyageId: 'RFE-2026-W42',
        carrier: 'Pacific & Atlantic SeaLines',
        reeferBaySlot: 'BAY-04-TIER-02',
        auxiliaryPowerConnected: true,
      },
      geo: { lat: 51.4508, lng: 6.7624, locationName: 'Duisburg Inland Port Terminal' },
      notes: 'Container plugged into vessel central electrical grid. Temp: -19.4°C.',
    },
    {
      eventType: 'TEMPERATURE_LOGGED',
      actor: c1ActorCarrier,
      timestamp: '2026-10-15T05:00:00.000Z',
      payload: {
        temperature: -18.9,
        humidity: 50.2,
        compressorStatus: 'NOMINAL',
      },
      geo: { lat: 51.6214, lng: 6.6211, locationName: 'Rhine River Mile Marker 812' },
    },
    {
      eventType: 'TEMPERATURE_SPIKE',
      actor: c1ActorCarrier,
      timestamp: '2026-10-15T09:20:00.000Z',
      payload: {
        temperature: -4.2, // Critical breach! Max allowed is -15.0C!
        humidity: 78.5,
        cause: 'REEFER_POWER_LOSS',
        durationMinutes: 185,
        alertLevel: 'SEVERITY_1_CRITICAL',
        spoiledUnits: 2400,
      },
      geo: { lat: 51.8542, lng: 5.8612, locationName: 'Nijmegen Inland Waterway Junction' },
      notes: 'CRITICAL ALARM: Auxiliary plug breaker tripped. Reefer cooling shut down for over 3 hours while vessel was underway!',
    },
    {
      eventType: 'REEFER_POWER_RESTORED',
      actor: c1ActorCarrier,
      timestamp: '2026-10-15T12:25:00.000Z',
      payload: {
        stabilizedTemperature: -16.8,
        actionTaken: 'Emergency backup generator reconnected and freon loop restarted',
        technician: 'Hans Gruber (Chief Marine Electrician)',
      },
      geo: { lat: 51.9022, lng: 5.3122, locationName: 'Tiel Canal Lock 3' },
      notes: 'Reefer brought back down into range, but cold-chain violation logged irreversibly.',
    },
    {
      eventType: 'PORT_CHECKPOINT_CLEARED',
      actor: c1ActorCarrier,
      timestamp: '2026-10-15T20:00:00.000Z',
      payload: {
        terminal: 'APM Terminals Maasvlakte II',
        dischargeCrane: 'STS-CRANE-08',
      },
      geo: { lat: 51.9545, lng: 4.0211, locationName: 'Port of Rotterdam, Maasvlakte II' },
      notes: 'Container offloaded from barge onto quayside reefer stack.',
    },
    {
      eventType: 'CUSTOMS_INSPECTED',
      actor: c1ActorCustoms,
      timestamp: '2026-10-16T08:30:00.000Z',
      payload: {
        inspectorName: 'Officer Jan Vermeer',
        sealStatus: 'INTACT',
        physicalInspection: 'PASSED',
        iotDataAuditStatus: 'FLAGGED_EXCURSION',
        status: 'HOLD',
      },
      geo: { lat: 51.9545, lng: 4.0211, locationName: 'Customs Phytosanitary Control Station' },
      notes: 'Physical bolt seal intact. However, IoT telemetry reveals severe excursion (-4.2°C). Consignment placed on regulatory quarantine hold.',
    },
    {
      eventType: 'DISPUTE_FILED',
      actor: c1ActorPharma,
      timestamp: '2026-10-16T11:45:00.000Z',
      payload: {
        disputeId: 'DISP-BIO-2026-091',
        claimant: 'BioVax BioPharma GmbH',
        respondent: 'Pacific & Atlantic SeaLines',
        claimAmountUSD: 420000,
        culpritEventSequence: 8,
        culpritCustodian: 'Pacific & Atlantic SeaLines',
        reason: 'Total batch degradation due to 185-minute reefer power blackout during Rhine transit. Temperature reached -4.2°C (limit -15°C).',
      },
      geo: { lat: 50.8021, lng: 8.7667, locationName: 'BioVax Legal & Compliance HQ' },
      notes: 'Legal claim initiated. Cryptographic chain of custody cited as primary audit evidence.',
    },
  ];

  let prevHash = GENESIS_HASH;
  for (let i = 0; i < c1Events.length; i++) {
    const raw = c1Events[i];
    const sequence = i + 1;
    const draft: Omit<LedgerEvent, 'hash'> = {
      id: `evt_c1_${sequence}`,
      sequence,
      globalSequence: globalSeqCounter++,
      aggregateId: container1,
      aggregateType: 'SHIPPING_CONTAINER',
      eventType: raw.eventType,
      timestamp: raw.timestamp,
      actor: raw.actor,
      payload: raw.payload,
      metadata: {
        ip: '10.24.8.91',
        deviceId: 'Sensitech-CryoEdge-89',
        geo: raw.geo,
        notes: raw.notes,
      },
      previousHash: prevHash,
    };
    const hash = calculateEventHash(draft);
    eventStore.push({ ...draft, hash });
    prevHash = hash;
  }

  // --- AGGREGATE 2: CONT-LUX-4410 (NVIDIA H100 GPU Silicon Cargo - Clean Flight) ---
  const container2 = 'CONT-LUX-4410';
  const c2ActorMfr: Actor = {
    id: 'ACT-TSMC-01',
    name: 'Lin Wei-Ting',
    role: 'Logistics Operations Director',
    organization: 'TSMC Fab 18 Foundry',
    publicKey: '0x99a2...18f3',
  };
  const c2ActorAir: Actor = {
    id: 'ACT-CARGO-77',
    name: 'Captain Jason Vance',
    role: 'Global Air Cargo Pilot',
    organization: 'Polar Global Air Freight',
    publicKey: '0x44dd...bc21',
  };

  const c2Events: Array<{
    eventType: EventType;
    actor: Actor;
    timestamp: string;
    payload: any;
    geo: { lat: number; lng: number; locationName: string };
    notes?: string;
  }> = [
    {
      eventType: 'CONTAINER_CREATED',
      actor: c2ActorMfr,
      timestamp: '2026-10-18T04:00:00.000Z',
      payload: {
        title: 'High-Security Armored Air Cargo ULD #4410',
        origin: 'Tainan Science Park, Taiwan',
        destination: 'Hyperscale Data Center Campus, Phoenix, AZ, USA',
        initialTemperature: 21.0,
        temperatureTarget: { min: 10.0, max: 30.0, unit: '°C' },
      },
      geo: { lat: 23.1118, lng: 120.2798, locationName: 'TSMC Cleanroom Dispatch Bay 3' },
      notes: 'Tamper-proof smart container with real-time biometric locks and dual GPS trackers.',
    },
    {
      eventType: 'INVENTORY_LOADED',
      actor: c2ActorMfr,
      timestamp: '2026-10-18T06:00:00.000Z',
      payload: {
        items: [
          {
            sku: 'NV-H100-SXM5',
            name: 'NVIDIA H100 80GB SXM5 AI Accelerators',
            quantity: 320,
            unit: 'modules',
            batchNumber: 'LOT-TW-2026-H100-992',
            valueUSD: 32000,
            temperatureRequired: { min: 10.0, max: 30.0, unit: '°C' },
          },
        ],
      },
      geo: { lat: 23.1118, lng: 120.2798, locationName: 'Tainan Cleanroom Secure Staging' },
      notes: 'Cargo manifest loaded. Total shipment valuation: $10,240,000 USD.',
    },
    {
      eventType: 'SEAL_AFFIXED',
      actor: c2ActorMfr,
      timestamp: '2026-10-18T06:45:00.000Z',
      payload: {
        sealNumber: 'SEAL-BIO-ENCRYPT-7729',
        lockMechanism: 'Dual Biometric Iris & Cryptographic Keycard Lock',
      },
      geo: { lat: 23.1118, lng: 120.2798, locationName: 'Tainan Dispatch Dock' },
    },
    {
      eventType: 'CUSTODY_TRANSFERRED',
      actor: c2ActorAir,
      timestamp: '2026-10-18T10:00:00.000Z',
      payload: {
        flightNumber: 'PO-892',
        aircraft: 'Boeing 747-8F',
        departureAirport: 'TPE',
        arrivalAirport: 'LAX',
      },
      geo: { lat: 25.0797, lng: 121.2342, locationName: 'Taoyuan International Airport (TPE)' },
    },
    {
      eventType: 'TEMPERATURE_LOGGED',
      actor: c2ActorAir,
      timestamp: '2026-10-18T16:00:00.000Z',
      payload: {
        temperature: 19.5,
        humidity: 32.0,
        cabinPressurePSI: 11.2,
      },
      geo: { lat: 35.1234, lng: -170.4321, locationName: 'Cruising FL350 Over North Pacific' },
    },
    {
      eventType: 'PORT_CHECKPOINT_CLEARED',
      actor: c2ActorAir,
      timestamp: '2026-10-19T01:30:00.000Z',
      payload: {
        status: 'TOUCHDOWN_CONFIRMED',
        runway: '24R',
      },
      geo: { lat: 33.9416, lng: -118.4085, locationName: 'Los Angeles International Airport (LAX)' },
    },
  ];

  prevHash = GENESIS_HASH;
  for (let i = 0; i < c2Events.length; i++) {
    const raw = c2Events[i];
    const sequence = i + 1;
    const draft: Omit<LedgerEvent, 'hash'> = {
      id: `evt_c2_${sequence}`,
      sequence,
      globalSequence: globalSeqCounter++,
      aggregateId: container2,
      aggregateType: 'SHIPPING_CONTAINER',
      eventType: raw.eventType,
      timestamp: raw.timestamp,
      actor: raw.actor,
      payload: raw.payload,
      metadata: {
        ip: '172.16.4.12',
        deviceId: 'SatCom-AeroLink-9',
        geo: raw.geo,
        notes: raw.notes,
      },
      previousHash: prevHash,
    };
    const hash = calculateEventHash(draft);
    eventStore.push({ ...draft, hash });
    prevHash = hash;
  }
}

// Seed on module start
seedInitialLedger();
