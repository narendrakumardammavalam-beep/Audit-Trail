export interface Actor {
  id: string;
  name: string;
  role: string;
  organization: string;
  publicKey: string;
}

export type EventType =
  | 'CONTAINER_CREATED'
  | 'SEAL_AFFIXED'
  | 'INVENTORY_LOADED'
  | 'LOADED_ON_VESSEL'
  | 'VESSEL_DEPARTED'
  | 'TEMPERATURE_LOGGED'
  | 'TEMPERATURE_SPIKE'
  | 'REEFER_POWER_RESTORED'
  | 'CUSTODY_TRANSFERRED'
  | 'PORT_CHECKPOINT_CLEARED'
  | 'CUSTOMS_INSPECTED'
  | 'CONTAINER_DISCHARGED'
  | 'INVENTORY_ADJUSTED'
  | 'SPOILAGE_FLAGGED'
  | 'DISPUTE_FILED'
  | 'DISPUTE_RESOLVED'
  | 'FINAL_DELIVERED';

export interface LedgerEvent {
  id: string;
  sequence: number; // Monotonic sequence within aggregate
  globalSequence: number; // Global sequence in event store
  aggregateId: string;
  aggregateType: 'SHIPPING_CONTAINER' | 'INVENTORY_LOT';
  eventType: EventType;
  timestamp: string;
  actor: Actor;
  payload: Record<string, any>;
  metadata: {
    ip: string;
    deviceId?: string;
    sensorModel?: string;
    geo: {
      lat: number;
      lng: number;
      locationName: string;
    };
    notes?: string;
  };
  previousHash: string;
  hash: string;
  tampered?: boolean;
  originalPayloadForSimulation?: Record<string, any>;
}

export interface InventoryItem {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  batchNumber: string;
  valueUSD: number;
  temperatureRequired: { min: number; max: number; unit: string };
  spoiledCount?: number;
}

export interface DisputeRecord {
  id: string;
  openedAt: string;
  claimant: string;
  respondent: string;
  claimAmountUSD: number;
  reason: string;
  status: 'OPEN' | 'INVESTIGATING' | 'SETTLED' | 'REJECTED';
  culpritEventSequence?: number;
  culpritCustodian?: string;
  resolution?: string;
  resolvedAt?: string;
}

export interface AggregateState {
  aggregateId: string;
  aggregateType: string;
  version: number; // Highest sequence number folded
  totalEventsCount: number;
  createdAt: string;
  lastUpdatedAt: string;
  title: string;
  origin: string;
  destination: string;
  vesselInfo?: {
    name: string;
    voyageId: string;
    carrier: string;
  };
  status:
    | 'INITIALIZED'
    | 'IN_TRANSIT'
    | 'AT_SEA'
    | 'AT_PORT'
    | 'CUSTOMS_HOLD'
    | 'DELIVERED'
    | 'QUARANTINED'
    | 'DISPUTED';
  currentLocation: {
    lat: number;
    lng: number;
    locationName: string;
  };
  currentCustodian: Actor;
  sealInfo: {
    sealNumber: string;
    affixedAt?: string;
    isIntact: boolean;
    tamperDetected: boolean;
  };
  telemetry: {
    temperatureTarget: { min: number; max: number; unit: string };
    currentTemperature: number;
    currentHumidity: number;
    minRecordedTemp: number;
    maxRecordedTemp: number;
    spikeIncidentsCount: number;
    powerLossIncidentsCount: number;
    isCurrentlyExcursion: boolean;
  };
  cargoManifest: InventoryItem[];
  totalCargoValueUSD: number;
  spoiledItemsCount: number;
  disputes: DisputeRecord[];
  chainHeadHash: string;
}

export interface LedgerVerificationResult {
  aggregateId: string;
  isValid: boolean;
  totalEventsChecked: number;
  genesisHash: string;
  headHash: string;
  brokenLinkIndex?: number;
  tamperedEventId?: string;
  expectedHash?: string;
  actualHash?: string;
  timestamp: string;
  verificationMessage: string;
}

export interface TelemetryPoint {
  sequence: number;
  timestamp: string;
  timeLabel: string;
  temperature: number;
  humidity: number;
  minThreshold: number;
  maxThreshold: number;
  isSpike: boolean;
  isPowerLoss: boolean;
  eventType?: EventType;
  eventTitle?: string;
  locationName: string;
  custodianOrg: string;
}
