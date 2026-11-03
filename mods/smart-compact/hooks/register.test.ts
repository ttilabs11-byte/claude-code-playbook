import { expect, mock, test } from 'claude-code/testing'

const TURN = { answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', usage: null } as const

function world(on: any, tokens: number) {
  const compacts: unknown[] = []
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('turn.complete', (_: any, e: any) => ({ text: e.answer }))
  on('prompt.submit', (_: any, e: any) => ({ text: e.text }))
  mock.env(on, { SMART_COMPACT_IDLE_MIN: '55', HOME: '/home' })
  on('tool.register', (_: any, e: any) => ({ value: { tool: `mcp__smart-compact__${e.name}` } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens, window: 1_000_000 }, rateLimits: [] } }))
  on('session.compact', (_: any, e: any) => { compacts.push(e); return { messages: [{ role: 'user', text: 'summary', toolUses: [], toolResults: [] }] } })
  on('fs.exists', () => ({ value: false }))
  on('fs.write', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  return compacts
}

test('compacts a big idle context just before the cache goes cold', async ($, on) => {
  const clock = mock.clock(on)
  const compacts = world(on, 260_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.complete(TURN)
  await clock.advance(54 * 60_000)
  expect(compacts.length).toBe(0)
  await clock.advance(60_000)
  expect(compacts.length).toBe(1)
})

test('a new prompt cancels the idle compaction', async ($, on) => {
  const clock = mock.clock(on)
  const compacts = world(on, 260_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.complete(TURN)
  await clock.advance(30 * 60_000)
  await $.prompt.submit({ text: 'next' })
  await clock.advance(40 * 60_000)
  expect(compacts.length).toBe(0)
})

test('leaves a small context alone', async ($, on) => {
  const clock = mock.clock(on)
  const compacts = world(on, 120_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.complete(TURN)
  await clock.advance(60 * 60_000)
  expect(compacts.length).toBe(0)
})

test('a subagent finishing does not arm the timer', async ($, on) => {
  const clock = mock.clock(on)
  const compacts = world(on, 260_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.complete({ ...TURN, agentId: 'a1' })
  await clock.advance(60 * 60_000)
  expect(compacts.length).toBe(0)
})

test('the model can ask to compact at a task boundary, only over the threshold', async ($, on) => {
  const clock = mock.clock(on)
  const compacts = world(on, 180_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.tool.call({ tool: 'mcp__smart-compact__compact_after_turn' })
  expect(String(r.result)).toContain('Queued')
  await $.turn.complete(TURN)
  await clock.advance(3_000)
  expect(compacts.length).toBe(1)
})

test('the task-boundary tool refuses a small context', async ($, on) => {
  const clock = mock.clock(on)
  const compacts = world(on, 90_000)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.tool.call({ tool: 'mcp__smart-compact__compact_after_turn' })
  expect(String(r.result)).toContain('Not queued')
  await $.turn.complete(TURN)
  await clock.advance(3_000)
  expect(compacts.length).toBe(0)
})
