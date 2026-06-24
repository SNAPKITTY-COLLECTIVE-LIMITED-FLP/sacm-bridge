import crypto from 'node:crypto'

export type BridgeStatus = 'imported' | 'rejected'
export type AxiomSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface LegacyImport {
  id?: string
  name?: string
  source?: string
  data?: unknown
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface AxiomViolation {
  path: string
  reason: 'credential' | 'pii' | 'financial' | 'oversized_payload'
  severity: AxiomSeverity
}

export interface AxiomFilterResult {
  clean: boolean
  violations: AxiomViolation[]
}

export interface AgentWorkSeal {
  agent: string
  timestamp: string
  signature: string
}

export interface WormEntry {
  seq: number
  event: string
  payloadHash: string
  previousSeal: string
  seal: string
  timestamp: string
}

export interface SACMProject {
  sacmId: string
  legacyId: string
  legacySource: string
  name: string
  payload: LegacyImport
  importedAt: string
  status: BridgeStatus
  integrityHmac: string
}

export interface BridgeReceipt {
  sacmId: string
  legacyId: string
  status: BridgeStatus
  importedAt: string
  nextStep: 'POST /api/gateway/optimizer'
  message: string
  axiom: AxiomFilterResult
  worm: WormEntry
  agentSeal: AgentWorkSeal
}

const CREDENTIAL_PATTERNS = [/password/i, /secret/i, /token/i, /api.?key/i, /private.?key/i, /bearer/i]
const PII_PATTERNS = [/ssn/i, /social.?security/i, /passport/i, /birth.?date/i, /\bdob\b/i]
const FINANCIAL_PATTERNS = [/credit.?card/i, /card.?number/i, /routing/i, /iban/i, /swift/i]

export class SACMBridge {
  private readonly projects = new Map<string, SACMProject>()
  private readonly worm: WormEntry[] = []

  constructor(private readonly secret = process.env.VAULT_MASTER_SECRET ?? 'dev-sacm-bridge-key') {
    if (process.env.NODE_ENV === 'production' && !process.env.VAULT_MASTER_SECRET) {
      throw new Error('VAULT_MASTER_SECRET is required in production')
    }
  }

  importLegacyProject(legacy: LegacyImport): BridgeReceipt {
    const axiom = runAxiomFilter(legacy)
    const now = new Date().toISOString()
    const legacyId = String(legacy.id ?? 'unknown')

    if (!axiom.clean) {
      const worm = this.appendWorm('bridge_rejected', { legacyId, axiom })
      const base = {
        sacmId: '',
        legacyId,
        status: 'rejected' as const,
        importedAt: now,
        nextStep: 'POST /api/gateway/optimizer' as const,
        message: `Axiom Filter rejected: ${axiom.violations.map(v => `${v.path}:${v.reason}`).join(', ')}`,
        axiom,
        worm,
      }
      return { ...base, agentSeal: this.signWork('NEXUS', base) }
    }

    const sacmId = `sacm_${crypto.randomUUID().replaceAll('-', '')}`
    const project: SACMProject = {
      sacmId,
      legacyId: String(legacy.id ?? crypto.randomUUID()),
      legacySource: String(legacy.source ?? 'unknown'),
      name: String(legacy.name ?? `imported_${sacmId.slice(5, 13)}`),
      payload: legacy,
      importedAt: now,
      status: 'imported',
      integrityHmac: this.hmac(`integrity:${sacmId}:${now}:${legacyId}`),
    }
    this.projects.set(sacmId, project)

    const worm = this.appendWorm('bridge_imported', {
      sacmId,
      legacyId: project.legacyId,
      legacySource: project.legacySource,
    })
    const base = {
      sacmId,
      legacyId: project.legacyId,
      status: 'imported' as const,
      importedAt: now,
      nextStep: 'POST /api/gateway/optimizer' as const,
      message: `Project imported to SACM mesh. sacmId: ${sacmId}`,
      axiom,
      worm,
    }
    return { ...base, agentSeal: this.signWork('NEXUS', base) }
  }

  getProject(sacmId: string): SACMProject | null {
    const project = this.projects.get(sacmId)
    if (!project) return null
    const expected = this.hmac(`integrity:${project.sacmId}:${project.importedAt}:${project.legacyId}`)
    if (project.integrityHmac !== expected) {
      throw new Error(`BORROW_CHAIN: integrity HMAC mismatch for ${sacmId}`)
    }
    return structuredClone(project)
  }

  getWormLog(): WormEntry[] {
    return this.worm.map(entry => ({ ...entry }))
  }

  verifyWormChain(): boolean {
    let previous = 'SACM_BRIDGE_GENESIS'
    for (const entry of this.worm) {
      const expected = this.hmac(`${entry.seq}:${entry.event}:${entry.payloadHash}:${previous}:${entry.timestamp}`)
      if (entry.previousSeal !== previous || entry.seal !== expected) return false
      previous = entry.seal
    }
    return true
  }

  private appendWorm(event: string, payload: unknown): WormEntry {
    const seq = this.worm.length
    const timestamp = new Date().toISOString()
    const previousSeal = this.worm.at(-1)?.seal ?? 'SACM_BRIDGE_GENESIS'
    const payloadHash = sha256(stableStringify(payload))
    const seal = this.hmac(`${seq}:${event}:${payloadHash}:${previousSeal}:${timestamp}`)
    const entry = { seq, event, payloadHash, previousSeal, seal, timestamp }
    this.worm.push(entry)
    return entry
  }

  private signWork(agent: string, payload: unknown): AgentWorkSeal {
    const timestamp = new Date().toISOString()
    return {
      agent,
      timestamp,
      signature: this.hmac(`${agent}:${timestamp}:${stableStringify(payload)}`),
    }
  }

  private hmac(message: string): string {
    return crypto.createHmac('sha256', this.secret).update(message).digest('hex')
  }
}

export function runAxiomFilter(payload: unknown, maxBytes = 262_144): AxiomFilterResult {
  const text = stableStringify(payload)
  const violations: AxiomViolation[] = []
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    violations.push({ path: '$', reason: 'oversized_payload', severity: 'high' })
  }
  scanValue(payload, '$', violations)
  return {
    clean: !violations.some(v => v.severity === 'critical'),
    violations,
  }
}

function scanValue(value: unknown, path: string, violations: AxiomViolation[]): void {
  if (value === null || value === undefined) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, `${path}[${index}]`, violations))
    return
  }
  if (typeof value !== 'object') return
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = `${path}.${key}`
    if (CREDENTIAL_PATTERNS.some(p => p.test(key))) {
      violations.push({ path: nextPath, reason: 'credential', severity: 'critical' })
    } else if (PII_PATTERNS.some(p => p.test(key))) {
      violations.push({ path: nextPath, reason: 'pii', severity: 'high' })
    } else if (FINANCIAL_PATTERNS.some(p => p.test(key))) {
      violations.push({ path: nextPath, reason: 'financial', severity: 'critical' })
    }
    scanValue(child, nextPath, violations)
  }
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj).sort().map(key => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}
