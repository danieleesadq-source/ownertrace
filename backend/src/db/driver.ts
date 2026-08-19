/**
 * driver.ts — CognoDB (Neo4j-compatible) connection layer.
 *
 * CognoDB speaks openCypher over Bolt and is fully compatible with the
 * official Neo4j JavaScript driver — no custom SDK required.
 *
 * Required environment variables:
 *   COGNODB_URI      Bolt URI, e.g. bolt://your-cluster.cognodb.io:7687
 *   COGNODB_USER     Database username
 *   COGNODB_PASSWORD Database password
 *
 * The driver instance is a singleton shared across all requests. Sessions
 * are opened per query and closed in a finally block to prevent leaks.
 */
import neo4j, { type Driver, type Record as NeoRecord } from 'neo4j-driver';
import { logger } from '../lib/logger';

let _driver: Driver | null = null;

function isConfigured(): boolean {
  return Boolean(
    process.env.COGNODB_URI &&
    process.env.COGNODB_USER &&
    process.env.COGNODB_PASSWORD,
  );
}

/**
 * Returns the shared driver instance, creating it on first call.
 * Throws a descriptive error if env vars are missing.
 */
export function getDriver(): Driver {
  if (_driver) return _driver;

  const uri = process.env.COGNODB_URI;
  const user = process.env.COGNODB_USER;
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      'CognoDB not configured. Set COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD environment variables.',
    );
  }

  _driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    // Connection pool: reuse up to 50 connections across requests
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 10_000,
  });

  return _driver;
}

/**
 * Verifies connectivity on startup. Logs a warning instead of crashing so
 * the server stays up and surfaces a clear error on the first real request.
 */
export async function verifyConnectivity(): Promise<void> {
  if (!isConfigured()) {
    logger.warn(
      'CognoDB env vars not set (COGNODB_URI, COGNODB_USER, COGNODB_PASSWORD). ' +
      'Running in mock-only mode — set env vars and restart to use the real database.',
    );
    return;
  }

  try {
    await getDriver().verifyConnectivity();
    logger.info('CognoDB connectivity verified');
  } catch (err) {
    logger.error({ err }, 'CognoDB connection failed — check COGNODB_URI and credentials');
  }
}

/**
 * Runs a single parameterized Cypher query and returns the raw records.
 *
 * ALWAYS use $param syntax with the params object — never string-concatenate
 * values into the Cypher string (injection risk).
 *
 * The session is always closed in the finally block regardless of success
 * or failure.
 */
export async function runQuery(
  cypher: string,
  params: Record<string, unknown> = {},
): Promise<NeoRecord[]> {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

/**
 * Gracefully closes the driver on process exit. Call once at shutdown.
 */
export async function closeDriver(): Promise<void> {
  if (_driver) {
    await _driver.close();
    _driver = null;
  }
}
