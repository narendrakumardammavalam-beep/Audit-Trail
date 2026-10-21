import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  getAllAggregatesList,
  getEventsForAggregate,
  foldEvents,
  verifyChainIntegrity,
  extractTelemetry,
  appendEventToStore,
  simulateTamper,
  restoreIntegrity,
  seedInitialLedger,
  GENESIS_HASH
} from './server/eventStore';
import { EventType, Actor } from './src/types/ledger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // -------------------------------------------------------------
  // CQRS QUERIES API (Read-Model Projections)
  // -------------------------------------------------------------

  // List all aggregates
  app.get('/api/queries/aggregates', (req, res) => {
    try {
      const aggregates = getAllAggregatesList();
      res.json({ success: true, data: aggregates });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get raw chronological append-only event stream for an aggregate
  app.get('/api/queries/events/:aggregateId', (req, res) => {
    try {
      const { aggregateId } = req.params;
      const events = getEventsForAggregate(aggregateId);
      res.json({
        success: true,
        data: {
          aggregateId,
          totalEvents: events.length,
          events,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export event stream as CSV for offline auditing
  app.get('/api/queries/events/:aggregateId/export.csv', (req, res) => {
    try {
      const { aggregateId } = req.params;
      const events = getEventsForAggregate(aggregateId);

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
        'PayloadJSON',
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
          escapeCSV(e.payload),
          escapeCSV(e.previousHash),
          escapeCSV(e.hash),
          e.tampered ? 'TRUE' : 'FALSE',
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="AuditTrail-${aggregateId}-ledger-${Date.now()}.csv"`
      );
      res.status(200).send(csvContent);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reconstruct state at specific sequence (Time Travel / Mathematical Fold)
  app.get('/api/queries/state/:aggregateId', (req, res) => {
    try {
      const { aggregateId } = req.params;
      const sequence = req.query.sequence !== undefined ? Number(req.query.sequence) : undefined;
      const events = getEventsForAggregate(aggregateId);

      if (events.length === 0) {
        return res.status(404).json({ success: false, error: `Aggregate ${aggregateId} not found` });
      }

      const state = foldEvents(events, sequence);
      res.json({
        success: true,
        data: {
          state,
          queriedSequence: sequence ?? events[events.length - 1].sequence,
          maxSequence: events[events.length - 1].sequence,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Cryptographic Ledger Verification (Checks every SHA-256 link from genesis)
  app.get('/api/queries/verify/:aggregateId', (req, res) => {
    try {
      const { aggregateId } = req.params;
      const events = getEventsForAggregate(aggregateId);
      const verification = verifyChainIntegrity(events);
      res.json({ success: true, data: verification });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Telemetry time series for Recharts
  app.get('/api/queries/telemetry/:aggregateId', (req, res) => {
    try {
      const { aggregateId } = req.params;
      const events = getEventsForAggregate(aggregateId);
      const telemetry = extractTelemetry(events);
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Formal Audit Proof Package (Cryptographic receipt & custody report)
  app.get('/api/queries/audit-proof/:aggregateId', (req, res) => {
    try {
      const { aggregateId } = req.params;
      const events = getEventsForAggregate(aggregateId);
      if (events.length === 0) {
        return res.status(404).json({ success: false, error: 'Aggregate not found' });
      }

      const verification = verifyChainIntegrity(events);
      const latestState = foldEvents(events);

      // Extract Chain of Custody transfers
      const custodyLineage = events
        .filter((e) => e.eventType === 'CONTAINER_CREATED' || e.eventType === 'CUSTODY_TRANSFERRED' || e.eventType === 'FINAL_DELIVERED')
        .map((e) => ({
          sequence: e.sequence,
          timestamp: e.timestamp,
          actor: e.actor,
          location: e.metadata.geo,
          eventType: e.eventType,
        }));

      // Extract anomalies & excursions
      const anomalies = events
        .filter((e) => e.eventType === 'TEMPERATURE_SPIKE' || e.eventType === 'DISPUTE_FILED' || e.tampered)
        .map((e) => ({
          sequence: e.sequence,
          eventType: e.eventType,
          timestamp: e.timestamp,
          details: e.payload,
          responsibleCustodian: e.actor.organization,
          location: e.metadata.geo.locationName,
        }));

      const auditProof = {
        generatedAt: new Date().toISOString(),
        auditorSystem: 'AuditTrail Cryptographic Forensic Engine v3.4',
        aggregateId,
        title: latestState.title,
        status: latestState.status,
        eventCount: events.length,
        cryptographicProof: {
          genesisHash: events[0]?.hash || GENESIS_HASH,
          headHash: events[events.length - 1]?.hash || GENESIS_HASH,
          hashingAlgorithm: 'SHA-256',
          isChainValid: verification.isValid,
          brokenLink: verification.brokenLinkIndex,
        },
        cargoManifest: latestState.cargoManifest,
        totalCargoValueUSD: latestState.totalCargoValueUSD,
        disputes: latestState.disputes,
        custodyLineage,
        anomalies,
        eventDigests: events.map((e) => ({
          seq: e.sequence,
          type: e.eventType,
          time: e.timestamp,
          prevHashShort: `${e.previousHash.slice(0, 10)}...`,
          hashShort: `${e.hash.slice(0, 10)}...`,
          actorOrg: e.actor.organization,
        })),
      };

      res.json({ success: true, data: auditProof });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // -------------------------------------------------------------
  // CQRS COMMANDS API (Write-Side: Validation & Append-Only Log)
  // -------------------------------------------------------------

  // Dispatch a command -> produces an immutable event
  app.post('/api/commands/dispatch', (req, res) => {
    try {
      const { aggregateId, aggregateType, eventType, actor, payload, metadata } = req.body;

      if (!aggregateId || !eventType || !actor) {
        return res.status(400).json({
          success: false,
          error: 'Missing required command fields (aggregateId, eventType, actor).',
        });
      }

      // Domain Invariant Validation
      const existingEvents = getEventsForAggregate(aggregateId);
      if (existingEvents.length === 0 && eventType !== 'CONTAINER_CREATED') {
        return res.status(422).json({
          success: false,
          error: `Domain Invariant Error: Cannot execute '${eventType}' on uninitialized container. First event must be CONTAINER_CREATED.`,
        });
      }

      if (existingEvents.length > 0 && eventType === 'CONTAINER_CREATED') {
        return res.status(422).json({
          success: false,
          error: `Domain Invariant Error: Container '${aggregateId}' is already initialized.`,
        });
      }

      const latestState = foldEvents(existingEvents);
      if (latestState.status === 'DELIVERED' && eventType !== 'DISPUTE_FILED' && eventType !== 'DISPUTE_RESOLVED') {
        return res.status(422).json({
          success: false,
          error: `Domain Invariant Error: Container is marked DELIVERED. Custody and sensor events are closed.`,
        });
      }

      const newEvent = appendEventToStore({
        aggregateId,
        aggregateType: aggregateType || 'SHIPPING_CONTAINER',
        eventType: eventType as EventType,
        actor: actor as Actor,
        payload: payload || {},
        metadata: metadata || { geo: { lat: 0, lng: 0, locationName: 'En route' } },
      });

      const updatedState = foldEvents(getEventsForAggregate(aggregateId));

      res.json({
        success: true,
        message: `Command accepted. Event #${newEvent.sequence} (${newEvent.eventType}) appended with cryptographic digest.`,
        data: {
          event: newEvent,
          updatedState,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Tamper Simulation Endpoint (to demonstrate forensic detection)
  app.post('/api/commands/tamper', (req, res) => {
    try {
      const { aggregateId, targetSequence, alteredField, maliciousValue } = req.body;
      const result = simulateTamper(
        aggregateId,
        Number(targetSequence),
        alteredField || 'temperature',
        maliciousValue !== undefined ? maliciousValue : -2.0
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Restore Ledger Integrity
  app.post('/api/commands/restore', (req, res) => {
    try {
      const { aggregateId } = req.body;
      const result = restoreIntegrity(aggregateId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset demo datasets
  app.post('/api/commands/reset', (req, res) => {
    try {
      seedInitialLedger();
      res.json({ success: true, message: 'All ledgers reset to initial canonical seed state.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mount Vite or static build
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AuditTrail Server] Event Sourcing & CQRS engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[AuditTrail Server] Failed to start:', err);
  process.exit(1);
});
