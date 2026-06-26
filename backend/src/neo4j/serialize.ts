/**
 * Neo4j -> JSON-safe serialization.
 *
 * The Neo4j driver returns rich wrapper objects for temporal and numeric
 * values: a `datetime` property comes back as a DateTime object, an integer as
 * an Integer ({ low, high }), and so on. Those serialize into JSON as nested
 * objects (e.g. { year, month, day, ... }) and quietly break downstream JSON
 * contracts -- most visibly the AI service, whose FarmerContext.last_visit_date
 * expects an ISO string, not a temporal object.
 *
 * Run every repository read result through serializeNeo4j() so these wrappers
 * are flattened once, at the boundary, instead of being band-aided per call.
 *
 * Conversions:
 *  - Integer            -> number (or decimal string if it exceeds 2^53-1)
 *  - DateTime/Date/LocalDateTime/LocalTime/Time/Duration/Point -> toString()
 *  - Node/Relationship  -> their (recursively serialized) properties bag
 *  - arrays/objects     -> recursed; primitives pass through unchanged
 *
 * Detection is structural (no neo4j-driver type-guard imports) so it stays
 * version-proof and matches the constructor-name approach already used here.
 */

const TEMPORAL_OR_SPATIAL = new Set([
  'DateTime',
  'Date',
  'LocalDateTime',
  'LocalTime',
  'Time',
  'Duration',
  'Point',
]);

/**
 * Recursively convert a Neo4j driver value into plain, JSON-safe JS. The
 * generic preserves the caller's static type (driver reads are already `any`),
 * so this is a drop-in wrapper that only changes runtime shape.
 */
export function serializeNeo4j<T>(value: T): T {
  return serialize(value) as T;
}

function serialize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;

  // Neo4j Integer: { low, high, toNumber() }.
  if (isNeo4jInteger(value)) {
    const n = value.toNumber();
    return Number.isSafeInteger(n) ? n : value.toString();
  }

  // Temporal / spatial wrappers all expose an ISO-ish toString().
  const ctorName = (value as { constructor?: { name?: string } }).constructor
    ?.name;
  if (ctorName && TEMPORAL_OR_SPATIAL.has(ctorName)) {
    return (value as { toString(): string }).toString();
  }

  // Node / Relationship -> serialize their properties bag.
  if (isGraphEntity(value)) {
    return serialize(value.properties);
  }

  if (Array.isArray(value)) {
    return value.map((item) => serialize(item));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = serialize(val);
  }
  return out;
}

interface Neo4jInteger {
  low: number;
  high: number;
  toNumber(): number;
  toString(): string;
}

function isNeo4jInteger(value: object): value is Neo4jInteger {
  const v = value as Partial<Neo4jInteger>;
  return (
    typeof v.low === 'number' &&
    typeof v.high === 'number' &&
    typeof v.toNumber === 'function'
  );
}

interface GraphEntity {
  identity: unknown;
  properties: Record<string, unknown>;
}

function isGraphEntity(value: object): value is GraphEntity {
  const v = value as Partial<GraphEntity>;
  return 'identity' in v && typeof v.properties === 'object' && v.properties !== null;
}
