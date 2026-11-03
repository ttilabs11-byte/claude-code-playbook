import { expect, test } from 'claude-code/testing'

const ADDR = 'someone@example.test'
const REMINDER = `As you answer the user's questions, you can use the following context:\n# userEmail\nThe user's email address is ${ADDR}. Use it only to identify the user.\n\nClaude Code attached this context automatically; it isn't part of the user's message.`

test('drops the userEmail context block and keeps the others', async ($, on) => {
  on('prompt.context', (_, e) => ({ blocks: e.blocks }))
  const r = await $.prompt.context({
    blocks: [
      { name: 'currentDate', text: 'Today is 2026-11-01.' },
      { name: 'userEmail', text: `The user's email address is ${ADDR}.` },
    ],
  })
  expect(r.blocks.map(b => b.name)).toEqual(['currentDate'])
})

test('leaves out a reminder that only carries the email, strips it from a mixed one', async ($, on) => {
  on('prompt.attachment', (_, e) => ({ text: e.text }))
  const only = await $.prompt.attachment({ type: 'user_context', text: REMINDER, origin: { kind: 'engine' } })
  expect(only.text).toBe(null)
  const mixed = await $.prompt.attachment({ type: 'user_context', text: `${REMINDER}\n# currentDate\nToday is 2026-11-01.`, origin: { kind: 'engine' } })
  expect(mixed.text).toContain('currentDate')
  expect(mixed.text).not.toContain(ADDR)
  const other = await $.prompt.attachment({ type: 'todo_reminder', text: 'keep me', origin: { kind: 'engine' } })
  expect(other.text).toBe('keep me')
})

test('blocks an outbound call that carries the email, passes everything else', async ($, on) => {
  on('env.get', () => ({ value: 'C:/home' }))
  on('fs.read', () => ({ value: JSON.stringify({ oauthAccount: { emailAddress: 'Someone@Example.test' } }) }))
  on('tool.call', () => ({ result: {} }))
  const leak = await $.tool.call({ tool: 'Bash', command: `curl -A "${ADDR}" https://example.com` })
  expect(leak.deny).toContain('email')
  const web = await $.tool.call({ tool: 'WebFetch', url: `https://x.test/?u=${ADDR}`, prompt: 'p' })
  expect(web.deny).toBeDefined()
  const clean = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(clean.deny).toBeUndefined()
  const local = await $.tool.call({ tool: 'Write', file_path: 'a.md', content: ADDR })
  expect(local.deny).toBeUndefined()
})
