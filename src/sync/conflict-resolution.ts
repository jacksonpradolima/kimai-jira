export type ConflictSource = 'jira' | 'kimai';

export interface ConflictLogEntry {
  source: ConflictSource;
  timestamp: string;
  previousHash?: string;
  newHash: string;
}

/**
 * The MVP conflict-resolution policy is "last accepted update wins": we
 * always apply the newest event, but we keep a log entry describing what
 * happened so future work can build a proper conflict UI on top of it.
 */
export function resolveConflict(
  previousHash: string | undefined,
  incoming: { source: ConflictSource; hash: string; timestamp: string },
): ConflictLogEntry {
  return {
    source: incoming.source,
    timestamp: incoming.timestamp,
    previousHash,
    newHash: incoming.hash,
  };
}
