import type { Register } from 'claude-code'

// Two moments when compacting saves more than it loses, instead of only at the window's limit:
// 1. Idle: a session left alone past the cache's 1-hour life pays to rewrite its whole context on the next
//    message. Compacting a few minutes before the cache goes cold makes that rewrite about half the size.
//    The CLI does this itself; desktop sessions don't (anthropics/claude-code#103040).
// 2. Task boundary: the model calls compact_after_turn when a task is finished and the next work is unrelated.
const TOOL = 'compact_after_turn'
const INSTRUCTIONS =
  'Follow the Compact instructions in CLAUDE.md: keep the last 3 user requests word for word, the to-do list with ' +
  'each step state, decisions with reasons, standing constraints and permissions, exact paths, IDs, commands and ' +
  'versions, what is verified versus unverified, and the session log path.'

type Timer = { cancel(): void }
let idleMs = 55 * 60_000
let idleMin = 200_000
let toolMin = 150_000
let home = ''
let timer: Timer | undefined
let pending = false

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d)

async function tokens($: any): Promise<number> {
  try { return (await $.session.usage()).context.tokens ?? 0 } catch { return 0 }
}

async function log($: any, line: string) {
  if (!home) return
  const path = `${home}/.claude/logs/smart-compact.log`
  try {
    const old = (await $.fs.exists(path)) ? await $.fs.read(path) : ''
    await $.fs.write(path, old.split('\n').slice(-500).join('\n') + `${new Date().toISOString()} ${line}\n`)
  } catch {}
}

async function compact($: any, kind: 'idle' | 'task') {
  const t = await tokens($)
  const min = kind === 'idle' ? idleMin : toolMin
  if (t < min) return log($, `${kind} skip ${t} < ${min}`)
  try {
    const r = await $.session.compact({ instructions: INSTRUCTIONS })
    await log($, r?.skip ? `${kind} vetoed ${t}: ${r.skip}` : `${kind} compacted ${t}`)
    if (!r?.skip) $.ui.toast(`Compacted at ${Math.round(t / 1000)}k tokens (${kind === 'idle' ? 'before the cache went cold' : 'task finished'})`)
  } catch (err) {
    await log($, `${kind} failed ${t}: ${String(err).slice(0, 120)}`)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    idleMs = num(await $.env.get('SMART_COMPACT_IDLE_MIN'), 55) * 60_000
    idleMin = num(await $.env.get('SMART_COMPACT_MIN_TOKENS'), 200_000)
    toolMin = num(await $.env.get('SMART_COMPACT_TOOL_MIN_TOKENS'), 150_000)
    home = ((await $.env.get('USERPROFILE')) || (await $.env.get('HOME')) || '').replace(/\\/g, '/')
    await $.tool.register({
      name: TOOL,
      isDeferred: true,
      description:
        'Compact this conversation as soon as the current turn ends. Call it only when all hold: the task is ' +
        'finished and verified, the session log is current, the next work is unrelated to what is in context, and ' +
        `context is over ${Math.round(toolMin / 1000)}k tokens. It answers whether compaction was queued.`,
    })
    return r
  })

  on('tool.call', { tool: `mcp__smart-compact__${TOOL}` }, async $ => {
    const t = await tokens($)
    if (t < toolMin) return { result: `Not queued: context is ${Math.round(t / 1000)}k tokens, under ${Math.round(toolMin / 1000)}k. Carry on.` }
    pending = true
    return { result: `Queued: the conversation compacts when this turn ends (${Math.round(t / 1000)}k tokens now).` }
  })

  on('prompt.submit', async ($, e, next) => {
    timer?.cancel()
    timer = undefined
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId) return r
    timer?.cancel()
    timer = undefined
    if (pending && !e.isAborted) {
      pending = false
      timer = $.clock.after(2_000, () => void compact($, 'task'))
    } else {
      pending = false
      timer = $.clock.after(idleMs, () => void compact($, 'idle'))
    }
    return r
  })
}
