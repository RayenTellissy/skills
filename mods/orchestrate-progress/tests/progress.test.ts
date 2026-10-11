import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { AgentSpawnInput, On } from 'claude-code'

const PLUGIN = 'orchestrate-progress'
const TOOL = 'mcp__orchestrate-progress__progress'
const SURFACES = ['terminal', 'desktop'] as const
type Surface = (typeof SURFACES)[number]

const SITE = { scroll: { offset: 0, bodyRows: 4 }, view: {} }
const BAND = {
  plugin: PLUGIN,
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 4, bodyColumns: 120, ...SITE },
} as const
const PANE = {
  plugin: PLUGIN,
  component: 'Pane',
  requestId: 'orchestrate-agents',
  props: { title: 'Agents', isFocused: false, bodyColumns: 60, placement: 'dock', ...SITE },
} as const

// What the engine itself answers beneath the plugin: its clock, its panes, and
// its own (empty) band.
const stubEngine = (on: On): void => {
  on('clock.now', () => ({ value: 1_000_000 }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', children: ['engine band'] }))
}

const spawnInput = (subagentType: string, description: string, prompt: string): AgentSpawnInput => ({
  tool_use_id: `tu-${subagentType}`,
  subagentType,
  description,
  prompt,
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5-5',
  background: true,
  fork: false,
})

// Everything a drawing shows, as text: Text children on the terminal, each Svg's alt on the desktop.
const drawn = async ($: Engine, target: typeof BAND | typeof PANE, surface: Surface): Promise<string> => {
  const ui = await $.ui.mount({ ...target, surface })
  const alts = (await ui.findAll({})).filter(el => el.type === 'Svg').map(el => String(el.props.alt))
  return [JSON.stringify(await ui.drawn()), ...alts].join('\n')
}

test('/orchestrate gets the progress instructions and raises the band; other skills are left alone', async ($, on) => {
  stubEngine(on)
  on('skill.prompt', (_$, e) => ({ text: e.text }))

  for (const surface of SURFACES) expect(await drawn($, BAND, surface)).toContain('engine band')

  expect((await $.skill.prompt({ skill: 'commit', text: 'Commit.' })).text).toBe('Commit.')
  for (const surface of SURFACES) expect(await drawn($, BAND, surface)).toContain('engine band')

  const r = await $.skill.prompt({ skill: 'orchestrate', text: '# Orchestrate' })
  expect(r.text.startsWith('# Orchestrate')).toBe(true)
  expect(r.text).toContain(`select:${TOOL}`)
  for (const surface of SURFACES) {
    const band = await drawn($, BAND, surface)
    expect(band).not.toContain('engine band')
    expect(band).toContain('Plan')
  }
})

test('the reported plan drives the band and the panel', async ($, on) => {
  stubEngine(on)
  const planned = await $.tool.call({
    tool: TOOL,
    title: 'Add OAuth login',
    phase: 'delegate',
    tasks: [
      { title: 'Session schema', agent: 'worker' },
      { title: 'OAuth callback', agent: 'specialist', after: [1] },
      { title: 'Login tests', agent: 'tester', after: [1] },
    ],
  })
  expect(planned.result).toBe('ok: Tasks 0/3')
  for (const surface of SURFACES) {
    const band = await drawn($, BAND, surface)
    expect(band).toContain('Add OAuth login')
    expect(band).toContain('Tasks 0/3')
    expect(band).toContain('0%')
  }

  // The planned tasks wait in the panel until a run with their title starts.
  for (const surface of SURFACES) {
    const pane = await drawn($, PANE, surface)
    for (const t of ['Session schema', 'OAuth callback', 'Login tests']) expect(pane).toContain(t)
  }

  expect((await $.tool.call({ tool: TOOL, finished: true })).result).toBe('ok: Done')
  for (const surface of SURFACES) expect(await drawn($, BAND, surface)).toContain('100%')
})

test("a planned task is done when its latest run finishes without error", async ($, on) => {
  stubEngine(on)
  let n = 0
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: `run-${++n}` }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  const finish = (agentId: string, reason: 'answer' | 'error') =>
    $.turn.complete({ agentId, reason, answer: '', durationMs: 1000, isAborted: false, turnId: `turn-${agentId}` })
  const band = async (text: string, percent: string) => {
    for (const surface of SURFACES) {
      const drawing = await drawn($, BAND, surface)
      expect(drawing).toContain(text)
      expect(drawing).toContain(percent)
    }
  }

  await $.tool.call({
    tool: TOOL,
    title: 'Add OAuth login',
    phase: 'delegate',
    tasks: [
      { title: 'Session schema', agent: 'worker' },
      { title: 'OAuth callback', agent: 'specialist', after: [1] },
      { title: 'Login tests', agent: 'tester', after: [1] },
    ],
  })
  await $.agent.spawn(spawnInput('worker', 'Session schema', 'Brief.')) // run-1
  await $.agent.spawn(spawnInput('specialist', 'OAuth callback', 'Brief.')) // run-2
  await $.agent.spawn(spawnInput('worker', 'Tidy imports', 'Brief.')) // run-3, no task
  await finish('run-1', 'answer')
  await finish('run-2', 'error')
  await finish('run-3', 'answer')
  await band('Tasks 1/3', '33%')

  // A second round of the failed task: running is not done; finished well, it is.
  await $.agent.spawn(spawnInput('specialist', 'OAuth callback', 'Fix.')) // run-4
  await band('Tasks 1/3', '33%')
  await finish('run-4', 'answer')
  await band('Tasks 2/3', '67%')
})

test('every agent keeps its prompt and fills the panel', async ($, on) => {
  stubEngine(on)
  const prompts: Record<string, string> = {}
  on('agent.spawn', (_$, e) => {
    prompts[e.subagentType] = e.prompt
    return { model: 'claude-opus-5-5', agentId: `id-${e.subagentType}` }
  })

  await $.agent.spawn(spawnInput('explorer', 'Map auth modules', 'Find.'))
  await $.agent.spawn(spawnInput('worker', 'Session schema', 'Brief.'))
  await $.agent.spawn(spawnInput('general-purpose', 'Misc', 'Do.'))

  expect(prompts.worker).toBe('Brief.')
  expect(prompts.explorer).toBe('Find.')
  expect(prompts['general-purpose']).toBe('Do.')

  // No /orchestrate and no report: the launches alone raise the band. The
  // general-purpose agent is no orchestrate role and is not counted.
  for (const surface of SURFACES) {
    expect(await drawn($, BAND, surface)).toContain('Tasks 2 running')
    const pane = await drawn($, PANE, surface)
    for (const d of ['Map auth modules', 'Session schema', 'Misc']) expect(pane).toContain(d)
  }
})

test("a worker run shows its role, model and the role's default effort before the engine reports one", async ($, on) => {
  stubEngine(on)
  on('agent.spawn', (_$, e) => ({ model: 'claude-opus-5-5', agentId: `id-${e.subagentType}` }))
  await $.agent.spawn(spawnInput('worker', 'Session schema', 'Brief.'))
  for (const surface of SURFACES) {
    const pane = await drawn($, PANE, surface)
    for (const t of ['Session schema', 'worker', 'Opus 5.5', 'medium']) expect(pane).toContain(t)
  }
})

test('a reviewer launch moves the band to Verify', async ($, on) => {
  stubEngine(on)
  on('agent.spawn', (_$, e) => ({ model: 'claude-opus-5-5', agentId: `id-${e.subagentType}` }))
  await $.tool.call({ tool: TOOL, title: 'Fix login', phase: 'delegate', tasks: [{ title: 'Fix it', agent: 'worker' }] })
  await $.agent.spawn(spawnInput('reviewer', 'Final review', 'Review.'))
  for (const surface of SURFACES) expect(await drawn($, BAND, surface)).toContain('Verify')
})

test('the crew button counts the crew and dismiss hides the band', async ($, on) => {
  stubEngine(on)
  await $.tool.call({ tool: TOOL, title: 'Fix login', phase: 'delegate', tasks: [{ title: 'Fix it', agent: 'worker' }] })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ key: 'crew' }))?.props.label).toBe('×1')
  }
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'dismiss' })
  for (const surface of SURFACES) expect(await drawn($, BAND, surface)).toContain('engine band')
})
