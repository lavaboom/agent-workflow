// Pure decisions for `sync`, one function per kind of file. Hashes are hex strings or null.

// recorded is the manifest entry from the last adopt/sync (or undefined for a file new to the manifest).
// R = project bytes recorded then; T0 = template bytes then (equal to R unless the project kept a local copy).
export function decideManaged({ projectHash, templateHash, recorded }) {
  if (projectHash === null) return { action: 'create' };
  if (projectHash === templateHash) return { action: 'unchanged' };
  if (!recorded) {
    return { action: 'conflict', note: 'present but not in the manifest, and differs from the template' };
  }
  const recordedHash = recorded.sha256;
  const recordedTemplateHash = recorded.templateSha256 ?? recordedHash;
  const editedSinceSync = projectHash !== recordedHash;
  const keptLocal = recordedHash !== recordedTemplateHash;
  const templateChanged = templateHash !== recordedTemplateHash;
  if (!editedSinceSync && !keptLocal && templateChanged) return { action: 'update' };
  if (!editedSinceSync && keptLocal && !templateChanged) {
    return { action: 'kept', note: 'local version kept earlier; template unchanged' };
  }
  return { action: 'conflict', note: conflictFacts({ editedSinceSync, keptLocal, templateChanged }) };
}

function conflictFacts({ editedSinceSync, keptLocal, templateChanged }) {
  const local = editedSinceSync ? 'local copy edited since last sync' : 'local version kept earlier';
  const upstream = templateChanged ? 'template changed since last sync' : 'template unchanged since last sync';
  return keptLocal && editedSinceSync ? `${local} (a kept local version); ${upstream}` : `${local}; ${upstream}`;
}

// Applies --take-template / --keep-local to a conflict decision.
export function resolveConflict(decision, { takeTemplate, keepLocal }) {
  if (decision.action !== 'conflict') return decision;
  if (takeTemplate) return { action: 'overwritten', note: decision.note };
  if (keepLocal) return { action: 'kept', note: decision.note };
  return decision;
}

// A managed file the manifest knows but the current template no longer lists.
export function decideRetired({ projectHash, recorded, prune }) {
  if (projectHash === null) return { action: 'retired', note: 'already deleted; dropped from the manifest', keepEntry: false };
  if (!prune) return { action: 'retired', note: 'no longer in the template; left in place (sync --prune deletes it)', keepEntry: true };
  if (projectHash === recorded.sha256) return { action: 'pruned', note: 'deleted (unmodified)', keepEntry: false };
  return { action: 'retired', note: 'modified locally; not pruned', keepEntry: true };
}
