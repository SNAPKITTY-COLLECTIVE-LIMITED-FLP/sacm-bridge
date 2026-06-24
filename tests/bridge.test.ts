import assert from 'node:assert/strict'
import test from 'node:test'
import { SACMBridge, runAxiomFilter } from '../src/index.js'

test('imports clean legacy payloads and appends a WORM receipt', () => {
  const bridge = new SACMBridge('test-secret')
  const receipt = bridge.importLegacyProject({
    id: 'legacy-1',
    name: 'Clean Project',
    source: 'github',
    data: { repo: 'example/project', build: 'pass' },
  })

  assert.equal(receipt.status, 'imported')
  assert.match(receipt.sacmId, /^sacm_/)
  assert.equal(receipt.agentSeal.agent, 'NEXUS')
  assert.equal(bridge.verifyWormChain(), true)
  assert.equal(bridge.getProject(receipt.sacmId)?.legacyId, 'legacy-1')
})

test('rejects credential-bearing payloads at the Axiom gate', () => {
  const result = runAxiomFilter({ data: { apiKey: 'do-not-import' } })
  assert.equal(result.clean, false)
  assert.equal(result.violations[0]?.reason, 'credential')
})

test('rejection still writes an auditable WORM event', () => {
  const bridge = new SACMBridge('test-secret')
  const receipt = bridge.importLegacyProject({ id: 'bad', token: 'secret' })
  assert.equal(receipt.status, 'rejected')
  assert.equal(receipt.sacmId, '')
  assert.equal(bridge.getWormLog()[0]?.event, 'bridge_rejected')
  assert.equal(bridge.verifyWormChain(), true)
})
