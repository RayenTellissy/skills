// Pure drawing and formatting: no `$`, so a preview script can render it too.
import type { AgentRun, Flow, PlannedTask } from '../types'

export const ACCENT = '#8f8cf4'
export const DONE = '#5fbf8f'
export const DEFAULT_TITLE = 'orchestrate'

export const S = {
  pane: 'Agents',
  cost: 'Cost',
  tokens: 'Tokens',
  time: 'Time',
  collapse: 'Collapse',
  expand: 'Expand',
  running: 'Running',
  finished: 'Finished',
  planned: 'Planned',
  empty: 'No subagents yet.',
  round: 'round',
  failed: 'error',
  after: 'after',
  tokensWord: 'tokens',
  agentsCount: 'agents',
  isRunning: 'running',
  isFinished: 'finished',
  isFailed: 'failed',
  isPlanned: 'planned',
  opened: 'Agents panel opened.',
  closed: 'Agents panel closed.',
  done: 'Done',
  plan: 'Plan',
  tasks: 'Tasks',
  verify: 'Verify',
  busy: 'running',
} as const

// ---------------------------------------------------------------------------
// The orchestrate skill's agent types. Effort mirrors each agent's frontmatter
// (all pinned to Opus 5.5), shown for planned tasks and for runs whose effort
// the engine has not reported yet.

export const ROLES = ['worker', 'specialist', 'explorer', 'tester', 'bug-hunter', 'designer', 'reviewer'] as const
export type Role = (typeof ROLES)[number]

const ROLE_COLOR: Record<Role | 'other', string> = {
  worker: '#378ADD',
  specialist: '#7F77DD',
  explorer: '#1D9E75',
  tester: '#C9487F',
  'bug-hunter': '#D85A30',
  designer: '#2AA5B8',
  reviewer: '#BA7517',
  other: '#888780',
}

const ROLE_EFFORT: Record<Role, string> = {
  worker: 'medium',
  specialist: 'high',
  explorer: 'low',
  tester: 'high',
  'bug-hunter': 'xhigh',
  designer: 'max',
  reviewer: 'xhigh',
}

export const isRole = (s: string): s is Role => (ROLES as readonly string[]).includes(s)

// `worker`, or `<plugin>:worker` when the agents ship in a plugin.
export const roleOf = (type: string): Role | 'other' => {
  const bare = type.replace(/^[^:]*:/, '').toLowerCase()
  return isRole(bare) ? bare : 'other'
}

export const colorOf = (role: string): string => ROLE_COLOR[isRole(role) ? role : 'other']

export const plannedModel = (role: string): string => (isRole(role) ? `Opus 5.5 · ${ROLE_EFFORT[role]}` : '')

// ---------------------------------------------------------------------------
// Cost: USD per million tokens, input, output, cache read, cache write (5-minute TTL).
// The engine reports tokens, not money, so the panel's cost is an estimate.

const PRICES: [RegExp, [number, number, number, number]][] = [
  [/fable|mythos/, [10, 50, 0.25, 12.5]],
  [/opus-5-5/, [4, 20, 0.2, 5]],
  [/opus/, [5, 25, 0.5, 6.25]],
  [/sonnet/, [2, 10, 0.2, 2.5]],
  [/haiku/, [1, 5, 0.1, 1.25]],
]

export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

const priceOf = (model: string): [number, number, number, number] =>
  PRICES.find(([re]) => re.test(model.toLowerCase()))?.[1] ?? [4, 20, 0.2, 5]

export const costOf = (model: string, u: Usage): number => {
  const [i, o, r, w] = priceOf(model)
  return (
    ((u.input_tokens || 0) * i +
      (u.output_tokens || 0) * o +
      (u.cache_read_input_tokens || 0) * r +
      (u.cache_creation_input_tokens || 0) * w) /
    1e6
  )
}

export const tokensOf = (u: Usage): number =>
  (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0)

export const windowOf = (model: string): number => (/haiku/i.test(model) ? 200_000 : 1_000_000)

export const modelName = (id: string): string => {
  const m = /(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(id)
  const [, family = '', major = '', minor] = m ?? []
  if (!family) return id.replace(/^claude-/, '').replace(/\[.*\]$/, '') || '—'
  return `${family.charAt(0).toUpperCase()}${family.slice(1).toLowerCase()} ${major}${minor ? '.' + minor : ''}`
}

export const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

export const fmtTokens = (n: number): string =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`

export const fmtCost = (usd: number): string => `$${usd < 10 ? usd.toFixed(2) : usd.toFixed(1)}`

export const fmtTime = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export const elapsed = (a: AgentRun, at: number): number => (a.endedAt ?? Math.max(at, a.startedAt)) - a.startedAt

// ---------------------------------------------------------------------------
// The flow: the plan the orchestrator reported, and what is running against it.

export type Planned = PlannedTask & { n: number }

export const plannedOf = (f: Flow | null, list: AgentRun[]): Planned[] => {
  if (!f || f.isFinished) return []
  const started = new Set(list.map(a => norm(a.description)))
  return f.tasks.map((t, i) => ({ ...t, n: i + 1 })).filter(t => !started.has(norm(t.title)))
}

// Pieces handed out and still running. Counted from the runs, not from Agent
// calls in flight: orchestrate's agents run in the background.
export const runningOf = (f: Flow, list: AgentRun[]): number => {
  const live = list.filter(a => a.status === 'running' && roleOf(a.type) !== 'other')
  if (!f.tasks.length) return live.length
  const titles = new Set(f.tasks.map(t => norm(t.title)))
  return live.filter(a => titles.has(norm(a.description))).length
}

// Planned tasks whose latest run (by title, in launch order) finished well. A
// task whose latest run is still going or failed, or that never ran, is not done.
export const doneOf = (f: Flow, list: AgentRun[]): number => {
  const latest = new Map<string, AgentRun>()
  for (const a of list) latest.set(norm(a.description), a)
  const done = f.tasks.filter(t => latest.get(norm(t.title))?.status === 'done').length
  return f.total ? Math.min(f.total, done) : done
}

export const label = (f: Flow, running: number, done: number): string => {
  if (f.isFinished) return S.done
  if (f.phase === 'plan') return S.plan
  if (f.phase === 'verify') return S.verify
  return `${S.tasks} ${f.total ? `${done}/${f.total}` : `${running} ${S.busy}`}`
}

export const ratio = (f: Flow, done: number): number => (f.isFinished ? 1 : f.total ? done / f.total : 0)

export const totals = (list: AgentRun[], at: number) => {
  const cost = list.reduce((s, a) => s + a.costUsd, 0)
  const tokens = list.reduce((s, a) => s + a.tokens, 0)
  const start = Math.min(...list.map(a => a.startedAt))
  const end = Math.max(...list.map(a => a.endedAt ?? Math.max(at, a.startedAt)))
  return { cost, tokens, time: list.length ? end - start : 0 }
}
export type Totals = ReturnType<typeof totals>

// The effort the engine reported; until then an orchestrate role's default.
export const effortOf = (a: AgentRun): string | undefined => {
  if (a.effort) return a.effort
  const role = roleOf(a.type)
  return role === 'other' ? undefined : ROLE_EFFORT[role]
}

// The row's second line: model, effort, then round and error when they apply.
export const agentMeta = (a: AgentRun): string[] => {
  const effort = effortOf(a)
  const meta = [effort ? `${modelName(a.model)} · ${effort}` : modelName(a.model)]
  if (a.round > 1) meta.push(`${S.round} ${a.round}`)
  if (a.status === 'failed') meta.push(S.failed)
  return meta
}

export const agentAlt = (a: AgentRun): string => {
  const role = roleOf(a.type)
  const effort = effortOf(a)
  const status = a.status === 'running' ? S.isRunning : a.status === 'done' ? S.isFinished : S.isFailed
  return `${a.description || a.type}: ${role === 'other' ? a.type : role}, ${modelName(a.model)}${effort ? `, ${effort}` : ''}, ${status}`
}

// ---------------------------------------------------------------------------
// Text measuring for SVG rows.

export const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',sans-serif"

const xml = (s: string): string =>
  s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

// Rough advance of system UI text, in em; good enough to size the title's slot.
const charEm = (ch: string): number => (/[\s.,:;'|!il1()[\]]/.test(ch) ? 0.3 : /[A-Zmw@%]/.test(ch) ? 0.72 : 0.56)

const textWidth = (s: string, size: number): number => [...s].reduce((w, ch) => w + charEm(ch) * size, 0)

// Cuts `s` to fit `maxW` pixels, with an ellipsis when it had to cut.
const fitText = (s: string, size: number, maxW: number): string => {
  if (textWidth(s, size) <= maxW) return s
  let out = ''
  for (const ch of s) {
    if (textWidth(out + ch + '…', size) > maxW) break
    out += ch
  }
  return out + '…'
}

// Deterministic noise so the dither does not shimmer between redraws.
const noise = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// ---------------------------------------------------------------------------
// Pixel Clawd: a 24×18 crab on a 30×28 grid, one costume per orchestrate role.
// The body keeps the brand clay; the role's color lives in the costume's accent.

export const CLAY = '#D97757'
const INK = '#1F1E1D'

// `cls` puts a pixel in a named group: `bd` (the default) is the body and its
// costume, `la`/`lb` the leg pairs, anything else a prop with its own motion.
type Fill = (x: number, y: number, w: number, h: number, c: string, cls?: string) => void

const stamp = (f: Fill, x: number, y: number, rows: string[], map: Record<string, string>, cls?: string): void =>
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => map[ch] && f(x + dx, y + dy, 1, 1, map[ch] ?? '', cls)))

// `armCls` lets a raised claw travel with the prop it holds.
const crabBody = (f: Fill, armFront = 0, armCls?: string): void => {
  f(7, 10, 16, 12, CLAY)
  f(3, 14, 4, 4, CLAY)
  f(23, 14 + armFront, 4, 4, CLAY, armCls)
  f(9, 12, 2, 2, INK)
  f(19, 12, 2, 2, INK)
  f(7, 22, 2, 4, CLAY, 'la')
  f(17, 22, 2, 4, CLAY, 'la')
  f(11, 22, 2, 4, CLAY, 'lb')
  f(21, 22, 2, 4, CLAY, 'lb')
}

// Pure CSS, run by the compositor: no redraws. Periods divide one second, so the
// once-a-second redraw of a running row restarts them in phase. Every crab walks;
// each costume adds its prop's own motion on top.
export const CRAB_CSS = `<style>
.run .la{animation:st .5s steps(1) infinite}.run .lb{animation:st .5s steps(1) infinite -.25s}
.run .bd{animation:bob .5s steps(1) infinite -.125s}
.run g{transform-box:fill-box}
@keyframes st{50%{transform:translateY(-1px)}}@keyframes bob{50%{transform:translateY(1px)}}
@keyframes blink{50%{opacity:.15}}
.c-specialist.run{animation:float 1s ease-in-out infinite}
.c-specialist.run .la,.c-specialist.run .lb,.c-specialist.run .bd{animation:none}
.c-specialist.run .ant{animation:blink 1s steps(1) infinite}
.c-specialist.run .star{animation:blink .5s steps(1) infinite -.25s}
@keyframes float{50%{transform:translateY(-2px)}}
.c-bug-hunter.run .it{animation:scan 1s steps(1) infinite}
.c-bug-hunter.run .gl{animation:blink 1s steps(1) infinite -.5s}
@keyframes scan{25%{transform:translate(-1px,1px)}50%{transform:translate(-2px,2px)}75%{transform:translate(-1px,1px)}}
.c-worker.run .it{transform-origin:100% 100%;animation:twist .5s ease-in-out infinite}
@keyframes twist{50%{transform:rotate(-35deg)}}
.c-tester.run .pan{transform-origin:0 50%;animation:tilt 1s ease-in-out infinite}
.c-tester.run .egg{animation:flip 1s ease-in-out infinite}
@keyframes tilt{20%,40%{transform:rotate(-12deg)}}@keyframes flip{30%{transform:translateY(-5px) scaleY(-1)}60%{transform:translateY(0)}}
.c-reviewer.run .la{animation-duration:.25s}.c-reviewer.run .lb{animation-duration:.25s;animation-delay:-.125s}
.c-reviewer.run .flag{transform-origin:0 50%;animation:wave .25s steps(1) infinite}
@keyframes wave{50%{transform:skewY(-12deg) scaleX(.85)}}
.c-explorer.run .it{transform-origin:50% 100%;animation:fence .5s ease-in-out infinite}
@keyframes fence{50%{transform:rotate(25deg)}}
.c-designer.run .it{transform-origin:50% 100%;animation:paint .5s ease-in-out infinite}
@keyframes paint{50%{transform:rotate(-22deg)}}
@media (prefers-reduced-motion: reduce){.run,.run g{animation:none!important}}
</style>`

const COSTUMES: Record<string, (f: Fill, t: string) => void> = {
  // Specialist: astronaut in a glass dome; floats instead of walking, the antenna and the star blink.
  specialist: (f, t) => {
    crabBody(f)
    f(6, 7, 18, 1, '#E6E8EE'); f(5, 8, 1, 14, '#E6E8EE'); f(24, 8, 1, 14, '#E6E8EE'); f(6, 22, 18, 1, '#C9CCD2')
    f(6, 8, 18, 14, 'rgba(169,214,245,.32)'); f(8, 9, 2, 1, '#fff'); f(8, 10, 1, 2, '#fff')
    f(14, 4, 2, 3, '#C9CCD2'); f(14, 2, 2, 2, t, 'ant'); f(13, 18, 4, 2, t)
    f(27, 3, 1, 3, '#F5C542', 'star'); f(26, 4, 3, 1, '#F5C542', 'star')
  },
  // Bug-hunter: detective with a deerstalker; the magnifier sweeps and glints.
  'bug-hunter': (f, t) => {
    crabBody(f, -4, 'it')
    stamp(f, 6, 3, ['......bbbbbb......', '....bbcbbcbbbb....', '...bbbbbbbbbbbb...', '..bcbbcbbcbbcbbb..', '.bbbbbbbbbbbbbbbb.', 'dddddddddddddddddd'], { b: '#7A4A26', c: '#A0703F', d: '#5A3519' })
    f(6, 9, 18, 1, t)
    stamp(f, 23, 1, ['.kkk.', 'k...k', 'k...k', 'k...k', '.kkk.'], { k: '#3A3A3C' }, 'it')
    f(24, 2, 3, 3, 'rgba(169,214,245,.7)', 'it'); f(25, 6, 1, 4, '#7A4A26', 'it'); f(24, 2, 1, 1, '#fff', 'gl')
  },
  // Worker: engineer in a hard hat; the wrench turns a bolt.
  worker: (f, t) => {
    crabBody(f)
    stamp(f, 6, 4, ['.....yyyyyyyy.....', '...yyyyyhhyyyyy...', '..yyyyyyhhyyyyyy..', '..yyyyyyhhyyyyyy..', '.yyyyyyyhhyyyyyyy.', 'dddddddddddddddddd'], { y: '#F5C542', h: '#FBE08A', d: '#C99A1E' })
    f(13, 5, 4, 2, t)
    stamp(f, 0, 10, ['.s.s', 'sss.', '.s..', '.s..'], { s: '#8E929A' }, 'it')
  },
  // Tester: chef taste-testing; tosses the omelette.
  tester: (f, t) => {
    crabBody(f, -4, 'pan')
    stamp(f, 6, 0, ['........lll.......', '.......lllll......', '.wwwwgwwwwwwgwwwww', 'wwwwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwwwww', 'wwwwwgwwwwwggwwwww', '.wwwwgwwwwwggwwwww', '.dddbbbbbbbbbbbbb.', '.dddbbbbbbbbbbbbb.', '.dddbbbbbbbbbbbbb.'], { w: '#F4F3EE', l: '#F7F6F2', g: '#D2D1C8', b: t, d: '#8E3560' })
    f(22, 8, 7, 2, '#4A4A48', 'pan'); f(26, 10, 1, 1, '#4A4A48', 'pan'); f(24, 7, 3, 1, '#F5B731', 'egg')
  },
  // Reviewer: racer in a helmet at the finish line; runs at double pace, the checkered flag flutters.
  reviewer: (f, t) => {
    crabBody(f, -4)
    stamp(f, 6, 5, ['....rrrrrrrrrr....', '..rrrrrrwwrrrrrr..', '.rrrrrrrwwrrrrrrr.', '.rrrrrrrwwrrrrrrr.', '.rrrrrrrwwrrrrrrr.', '.kkkkkkkkkkkkkkkkr'], { r: t, w: '#F8F6F1', k: INK })
    f(25, 1, 1, 9, '#8E929A')
    stamp(f, 26, 1, ['wkwk', 'kwkw', 'wkwk'], { w: '#F8F6F1', k: INK }, 'flag')
  },
  // Explorer: pirate scouting the code; the cutlass fences.
  explorer: f => {
    crabBody(f)
    stamp(f, 5, 3, ['.kk..............kk.', '.kkk....kkkk....kkk.', '..kkkkkkkwwkkkkkkk..', '..kkkkkkkkkkkkkkkk..', '.gggggggggggggggggg.'], { k: '#55514C', w: '#F8F6F1', g: '#F5C542' })
    f(7, 11, 11, 1, INK); f(18, 11, 4, 3, INK)
    f(27, 6, 1, 9, '#C9CCD2', 'it'); f(26, 15, 3, 1, '#7A4A26', 'it')
  },
  // Designer: artist in a beret with a palette; the brush sweeps strokes.
  designer: (f, t) => {
    crabBody(f, -4, 'it')
    stamp(f, 5, 5, ['..........k.......', '.....bbbbbbbbb....', '..bbbbbbbbbbbbbbb.', 'bbbbbbbbbbbbbbbbbb', '.ddddddddddddddd..'], { b: t, d: '#1B6F7C', k: INK })
    stamp(f, 24, 0, ['.p.', 'ppp', 'sss', '.h.', '.h.', '.h.', '.h.', '.h.', '.h.', '.h.'], { p: '#E2504C', s: '#C9CCD2', h: '#7A4A26' }, 'it')
    stamp(f, 0, 17, ['.wwww.', 'wrwgww', 'wwbwyw', '.wwww.'], { w: '#E8D3A8', r: '#E2504C', g: '#3BAA5C', b: '#3B7DDD', y: '#F5C542' })
  },
  other: f => crabBody(f),
}

export const COSTUME_NAMES = Object.keys(COSTUMES)

// The built-in Explore agent borrows the explorer's costume.
export const costumeOf = (type: string): string => (type === 'Explore' ? 'explorer' : roleOf(type))

const CRAB_SCALE = 1.1

// Body and props nest inside `bd` so a prop rides the bob and adds its own motion;
// legs stay outside it and step on their own.
export const crab = (x: number, y: number, costume: string, dim = false, isWalking = false, scale = CRAB_SCALE): string => {
  const groups = new Map<string, string[]>([['bd', []]])
  const f: Fill = (cx, cy, w, h, c, cls = 'bd') => {
    if (!groups.has(cls)) groups.set(cls, [])
    groups.get(cls)?.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" fill="${c}"/>`)
  }
  const draw = COSTUMES[costume] ?? ((g: Fill) => crabBody(g))
  draw(f, colorOf(costume))
  const group = (cls: string) => `<g class="${cls}">${(groups.get(cls) ?? []).join('')}</g>`
  const props = [...groups.keys()].filter(k => k !== 'bd' && k !== 'la' && k !== 'lb')
  const body = `<g class="bd">${(groups.get('bd') ?? []).join('')}${props.map(group).join('')}</g>`
  return `<g transform="translate(${x},${y}) scale(${scale})" opacity="${dim ? 0.45 : 1}" shape-rendering="crispEdges"><g class="c-${costume}${isWalking ? ' run' : ''}">${body}${group('la')}${group('lb')}</g></g>`
}

// ---------------------------------------------------------------------------
// The band above the prompt. The whole row is one SVG: the desktop wraps sibling
// elements onto new lines, so title, bar, percent and the crab live in one
// drawing; only the crew count and the dismiss are Buttons beside it.

export const H = 22
const BAR_H = 16
const CRAB_W = 26
const CELL = 3

export const rowSvg = (f: Flow, running: number, done: number, W: number, isWorking: boolean): string => {
  // The title takes what it needs, up to 40% of the row; the bar takes the rest.
  const title = fitText(f.title, 13, Math.max(60, W * 0.4))
  const BAR_X = Math.round(16 + textWidth(title, 13) + 12)
  const BAR_W = Math.max(60, W - BAR_X - 46 - CRAB_W)
  const color = f.isFinished ? DONE : ACCENT
  const y0 = (H - BAR_H) / 2
  const fillW = Math.round(BAR_W * ratio(f, done))
  const runW = f.total ? Math.round((BAR_W * Math.min(f.total, done + running)) / f.total) : 0
  const dots: string[] = []

  // Dithered fill: sparse at the start, dense toward the head.
  const cols = Math.floor(fillW / CELL)
  const rows = Math.floor(BAR_H / CELL)
  for (let c = 0; c < cols; c++) {
    const density = 0.35 + 0.6 * Math.pow(c / Math.max(1, cols), 1.2)
    for (let r = 0; r < rows; r++) {
      if (noise(c, r) < density) dots.push(`<rect class="t${Math.floor(noise(r, c) * 4)}" x="${c * CELL + 1}" y="${r * CELL + 1}" width="2" height="2"/>`)
    }
  }
  // Handed to agents, not yet done: a faint second layer.
  const faint: string[] = []
  for (let c = cols; c < Math.floor(runW / CELL); c++) {
    for (let r = 0; r < rows; r++) {
      if (noise(c + 7, r + 3) < 0.2) faint.push(`<rect class="t${Math.floor(noise(r + 5, c) * 4)}" x="${c * CELL + 1}" y="${r * CELL + 1}" width="1.7" height="1.7"/>`)
    }
  }

  const ticks: string[] = []
  for (let i = 1; i < f.total; i++) {
    const x = Math.round((BAR_W * i) / f.total)
    if (x > fillW + 4) ticks.push(`<rect x="${x}" y="${BAR_H / 2 - 4}" width="1.5" height="8" rx="0.75"/>`)
  }

  const text = label(f, running, done)
  const pillW = Math.round(18 + text.length * 6.6)
  const pillX = Math.max(0, Math.min(BAR_W - pillW, fillW - pillW))
  const percent = `${Math.round(ratio(f, done) * 100)}%`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>
.t{fill:#1f1f1f}.m{fill:#8a8a8a}.k{fill:#e4e4e2}.tk{fill:#b4b4b0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.m{fill:#9a9a9a}.k{fill:#2c2c2c}.tk{fill:#5a5a5a}}
/* Pixels twinkle in four out-of-phase groups; a finished bar settles to a slow glow. */
.t0,.t1,.t2,.t3{animation:tw ${f.isFinished ? 3.2 : 2.2}s ease-in-out infinite}
.t1{animation-duration:${f.isFinished ? 3.8 : 2.8}s;animation-delay:-.7s}.t2{animation-duration:${f.isFinished ? 4.4 : 1.9}s;animation-delay:-1.3s}.t3{animation-duration:${f.isFinished ? 3.5 : 3.3}s;animation-delay:-.4s}
@keyframes tw{0%,100%{opacity:1}50%{opacity:${f.isFinished ? 0.8 : 0.3}}}
@media (prefers-reduced-motion: reduce){.t0,.t1,.t2,.t3{animation:none}}
</style>
<defs><clipPath id="c"><rect x="0" y="0" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/></clipPath></defs>
<circle cx="5" cy="${H / 2}" r="4" fill="${color}"/>
<text class="t" x="16" y="${H / 2 + 4.5}" font-family="${FONT}" font-size="13" font-weight="500">${xml(title)}</text>
<g transform="translate(${BAR_X},${y0})">
<rect class="k" width="${BAR_W}" height="${BAR_H}" rx="${BAR_H / 2}"/>
<g clip-path="url(#c)">
<g fill="${color}">${dots.join('')}</g>
<g fill="${color}" opacity="0.45">${faint.join('')}</g>
<g class="tk">${ticks.join('')}</g>
</g>
<rect x="${pillX}" width="${pillW}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${color}"/>
<text x="${pillX + pillW / 2}" y="${BAR_H / 2 + 4}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="600" fill="#ffffff">${xml(text)}</text>
</g>
<text class="m" x="${W - CRAB_W - 6}" y="${H / 2 + 4.5}" text-anchor="end" font-family="${FONT}" font-size="12.5" font-variant-numeric="tabular-nums">${percent}</text>
${CRAB_CSS}${crab(W - CRAB_W + 1, 0, 'other', false, isWorking, 0.8)}
</svg>`
}

export const barText = (f: Flow, done: number, width: number): string => {
  const filled = Math.round(width * ratio(f, done))
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
}

// ---------------------------------------------------------------------------
// The agents pane on the desktop: each row is one SVG, as the band is.

const PANE_CSS = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.m{fill:#9a9a96}.k{fill:#ecebe8}.ln{stroke:#e4e4e1}.tile{fill:#f4f3f0}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.m{fill:#7d7d79}.k{fill:#2c2c2b}.ln{stroke:#333331}.tile{fill:#262625}}
.live{animation:p 1.6s ease-in-out infinite}@keyframes p{50%{opacity:.3}}
@media (prefers-reduced-motion: reduce){.live{animation:none}}
</style>`

const statusMark = (x: number, y: number, status: string, color: string): string => {
  if (status === 'running') return `<circle class="live" cx="${x}" cy="${y}" r="3.5" fill="${color}"/>`
  if (status === 'done') return `<path d="M${x - 5} ${y}l3.5 3.5 6.5-7" fill="none" stroke="#3B9C5F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
  if (status === 'failed') return `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="#D0453F" stroke-width="1.8" stroke-linecap="round"/>`
  return `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#9a9a96" stroke-width="1.4"/><path d="M${x} ${y - 2.5}v2.8l1.8 1.2" fill="none" stroke="#9a9a96" stroke-width="1.4" stroke-linecap="round"/>`
}

const svg = (W: number, H: number, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${PANE_CSS}${CRAB_CSS}${body}</svg>`

export const headerHeight = (title: string): number => (title ? 72 : 44)

// The pane's own title already says "Agents": the header names the flow, if any.
export const headerSvg = (W: number, title: string, t: Totals): string => {
  const gap = 6
  const tw = (W - gap * 2) / 3
  const top = title ? 28 : 0
  const tile = (i: number, k: string, v: string) =>
    `<rect class="tile" x="${i * (tw + gap)}" y="${top}" width="${tw}" height="40" rx="8"/>
<text class="s" x="${i * (tw + gap) + 9}" y="${top + 16}" font-family="${FONT}" font-size="11">${k}</text>
<text class="t" x="${i * (tw + gap) + 9}" y="${top + 33}" font-family="${FONT}" font-size="15" font-weight="600" font-variant-numeric="tabular-nums">${v}</text>`
  return svg(
    W,
    headerHeight(title),
    `${title ? `<text class="t" x="0" y="15" font-family="${FONT}" font-size="14" font-weight="600">${xml(fitText(title, 14, W))}</text>` : ''}
${tile(0, S.cost, '≈' + fmtCost(t.cost))}${tile(1, S.tokens, fmtTokens(t.tokens))}${tile(2, S.time, fmtTime(t.time))}`,
  )
}

export const PLANNED_H = 46
export const AGENT_H = PLANNED_H
export const COMPACT_H = 32

// As the background-tasks list draws a task: the crab, the description, then
// role, model and effort; the status and elapsed time at the right.
export const agentSvg = (W: number, a: AgentRun, at: number): string => {
  const role = roleOf(a.type)
  const color = colorOf(costumeOf(a.type))
  const time = fmtTime(elapsed(a, at))
  const textW = W - 42 - 22
  const roleText = role === 'other' ? a.type : role
  const metaW = Math.max(0, W - 42 - textWidth(time, 11) - 12 - textWidth(roleText + '  ', 11))
  return svg(
    W,
    AGENT_H,
    `${crab(0, 6, costumeOf(a.type), false, a.status === 'running')}
<text class="t" x="42" y="18" font-family="${FONT}" font-size="13" font-weight="600">${xml(fitText(a.description || a.type, 13, textW))}</text>
<text x="42" y="34" font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(roleText)}</tspan><tspan class="s">  ${xml(fitText(agentMeta(a).join('  ·  '), 11, metaW))}</tspan></text>
${statusMark(W - 8, 16, a.status, color)}
<text class="s" x="${W}" y="34" text-anchor="end" font-family="${FONT}" font-size="11" font-variant-numeric="tabular-nums">${time}</text>
<line class="ln" x1="0" y1="45.5" x2="${W}" y2="45.5"/>`,
  )
}

export const plannedSvg = (W: number, p: Planned): string => {
  const role = isRole(p.agent) ? p.agent : 'other'
  const color = colorOf(role)
  const textW = W - 42 - 22
  const meta = [plannedModel(role)]
  if (p.after.length) meta.push(`${S.after} ${p.after.join(', ')}`)
  return svg(
    W,
    PLANNED_H,
    `${crab(0, 6, role, true)}
<text class="s" x="42" y="18" font-family="${FONT}" font-size="13" font-weight="600">${xml(fitText(`${p.n}. ${p.title}`, 13, textW))}</text>
<text x="42" y="34" font-family="${FONT}" font-size="11"><tspan fill="${color}">${xml(role === 'other' ? p.agent || role : role)}</tspan><tspan class="m">  ${xml(meta.filter(Boolean).join('  ·  '))}</tspan></text>
${statusMark(W - 8, 16, 'planned', color)}
<line class="ln" x1="0" y1="45.5" x2="${W}" y2="45.5"/>`,
  )
}

export const compactSvg = (W: number, list: AgentRun[], planned: Planned[], t: Totals): string => {
  const icons = [
    ...list.filter(a => a.status === 'running').map(a => ({ k: costumeOf(a.type), s: 'running', dim: false })),
    ...list.filter(a => a.status !== 'running').map(a => ({ k: costumeOf(a.type), s: a.status, dim: false })),
    ...planned.map(p => ({ k: isRole(p.agent) ? p.agent : 'other', s: 'planned', dim: true })),
  ]
  const fit = Math.max(1, Math.floor((W - 150) / 36))
  const shown = icons.slice(0, fit)
  const more = icons.length - shown.length
  const body = shown
    .map((ic, i) => crab(i * 36, 0, ic.k, ic.dim, ic.s === 'running') + (ic.s === 'running' ? `<circle class="live" cx="${i * 36 + 32}" cy="4" r="3" fill="${colorOf(ic.k)}"/>` : ''))
    .join('')
  const x = shown.length * 36 + (more ? 4 : 0)
  return svg(
    W,
    COMPACT_H,
    `${body}${more ? `<text class="s" x="${x}" y="21" font-family="${FONT}" font-size="12">+${more}</text>` : ''}
<text class="s" x="${W}" y="21" text-anchor="end" font-family="${FONT}" font-size="12" font-variant-numeric="tabular-nums">≈${fmtCost(t.cost)} · ${fmtTokens(t.tokens)} · ${fmtTime(t.time)}</text>`,
  )
}

// ---------------------------------------------------------------------------
// Terminal: the same rows in text.

export const STATUS_GLYPH: Record<string, string> = { running: '●', done: '✓', failed: '✗', planned: '◷' }
