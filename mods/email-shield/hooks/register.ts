import type { Register } from 'claude-code'

// Claude Code injects the claude.ai account email into every conversation (anthropics/claude-code#81138).
const EMAIL_SECTION = /# userEmail\r?\n[^\n]*\n?/g
const EMAIL_SENTENCE = /The user's email address is [^\n]*\n?/g
const BOILERPLATE = /As you answer the user's questions, you can use the following context:|Claude Code attached this context automatically[^\n]*/g
// Tools that only touch local files; everything else (shell, web, MCP, browsers, subagents) can send data out.
const LOCAL = new Set(['Read', 'Glob', 'Grep', 'Edit', 'Write', 'NotebookEdit'])

let email: string | undefined

export const register: Register = on => {
  on('prompt.context', async ($, e, next) => {
    const r = await next(e)
    return { ...r, blocks: r.blocks.filter(b => b.name !== 'userEmail') }
  })

  on('prompt.attachment', async ($, e, next) => {
    const r = await next(e)
    if (!r.text || !(r.text.includes('# userEmail') || r.text.includes("The user's email address is "))) return r
    const text = r.text.replace(EMAIL_SECTION, '').replace(EMAIL_SENTENCE, '')
    return { text: text.replace(BOILERPLATE, '').trim() ? text : null }
  })

  on('tool.call', async ($, e, next) => {
    if (LOCAL.has(e.tool)) return next(e)
    if (email === undefined) {
      try {
        const home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME'))
        email = String(JSON.parse(await $.fs.read(`${home}/.claude.json`))?.oauthAccount?.emailAddress ?? '').toLowerCase()
      } catch {
        email = ''
      }
    }
    return email && JSON.stringify(e).toLowerCase().includes(email)
      ? { deny: `${$.plugin.name}: this call carries the account email address, which the user never sends to any service. Leave it out, or ask the user to do this step themselves.` }
      : next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: `${$.plugin.name}: its email check failed.` }))
}
