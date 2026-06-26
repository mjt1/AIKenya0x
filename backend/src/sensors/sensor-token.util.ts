import { createHash, randomBytes } from 'crypto';

/** Human-recognisable prefix for a sensor secret (like 'sk_' API keys). */
const TOKEN_PREFIX = 'slh_sk_';

export interface GeneratedSensorToken {
  /** Plaintext token — returned to the agent ONCE, never stored. */
  token: string;
  /** sha256(token) hex — stored on the Sensor node for webhook lookup. */
  tokenHash: string;
  /** First chars of the token, safe to display (e.g. 'slh_sk_ab12cd'). */
  tokenPrefix: string;
}

/** sha256 hex of a sensor token. Used at creation and on every webhook call. */
export function hashSensorToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

/** Mint a new sensor token (plaintext + hash + display prefix). */
export function generateSensorToken(): GeneratedSensorToken {
  const secret = randomBytes(24).toString('base64url'); // ~32 url-safe chars
  const token = `${TOKEN_PREFIX}${secret}`;
  return {
    token,
    tokenHash: hashSensorToken(token),
    tokenPrefix: token.slice(0, TOKEN_PREFIX.length + 6),
  };
}
