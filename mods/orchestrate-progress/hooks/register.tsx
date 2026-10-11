import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRun, Flow, Panel, Phase, PlannedTask } from '../types'
import {
  ACCENT,
  AGENT_H,
  CLAY,
  COMPACT_H,
  DEFAULT_TITLE,
  DONE,
  H,
  PLANNED_H,
  ROLES,
  S,
  STATUS_GLYPH,
  agentAlt,
  agentMeta,
  agentSvg,
  allDoneOf,
  barText,
  colorOf,
  compactSvg,
  costOf,
  costumeOf,
  doneOf,
  elapsed,
  fmtCost,
  fmtTime,
  fmtTokens,
  headerHeight,
  headerSvg,
  isRole,
  label,
  norm,
  plannedModel,
  plannedOf,
  plannedSvg,
  ratio,
  roleOf,
  rowSvg,
  runningOf,
  tokensOf,
  totals,
  windowOf,
} from './draw'

const flow = atom({ plugin: 'orchestrate-progress', key: 'flow' } as const, null)
const agents = atom({ plugin: 'orchestrate-progress', key: 'agents' } as const, [])
const panel = atom({ plugin: 'orchestrate-progress', key: 'panel' } as const, {
  isCompact: false,
  isDoneCollapsed: false,
  autoOpenedFor: '',
})
const now = atom({ plugin: 'orchestrate-progress', key: 'now' } as const, 0)

const TOOL = 'mcp__orchestrate-progress__progress'
const PANE = 'orchestrate-agents'
const PHASES: readonly Phase[] = ['plan', 'delegate', 'verify']

// Appended to the orchestrate skill as it expands, so the skill itself stays
// unchanged and runs as before without the mod.
const ORCH_NOTE = `## Progress bar

The orchestrate-progress mod draws a progress bar above the prompt and an agents panel. Keep it current with \`${TOOL}\`: load it with ToolSearch (\`select:${TOOL}\`), in the same call as the session-title tool. Call it:

- Once the plan is set, before the first launch: \`title\` (the goal in a few words), \`phase: "delegate"\`, and \`tasks\`, one per Agent launch you plan (not explorers or reviewers), in launch order, each with the \`agent\` type it goes to and \`after\` listing the task numbers it waits for. Launch each with an Agent \`description\` equal to its task title, so the panel matches runs to tasks.
- When you re-plan (a piece added, split or dropped): the full \`tasks\` list again.
- Once, with the final report: \`finished: true\`.

The rest follows the agents on their own: a task counts as done once its latest run finishes without error, and a reviewer launched once every task is done moves the bar to Verify. Fields left out keep their value. Each call is cheap and silent: make it in the same message as the launches or status note it goes with, never as a turn of its own. Skip it if ToolSearch does not find the tool.`

type ProgressInput = {
  title?: string
  total?: number
  phase?: Phase
  finished?: boolean
  tasks?: { title?: string; agent?: string; after?: number[] }[]
}

const blank = (): Flow => ({
  title: DEFAULT_TITLE,
  total: 0,
  phase: 'plan',
  isFinished: false,
  tasks: [],
})

// A new title means a new flow, unless the flow so far had no name of its own
// (opened by /orchestrate or a first launch before the plan was reported).
const isNewFlow = (prev: Flow | null, input: ProgressInput): boolean => {
  if (!prev || prev.isFinished) return true
  const title = input.title?.trim()
  return !!title && title !== prev.title && prev.title !== DEFAULT_TITLE
}

const cleanTasks = (tasks: ProgressInput['tasks']): PlannedTask[] | undefined =>
  tasks
    ?.filter(t => t.title?.trim())
    .map(t => ({
      title: (t.title ?? '').trim(),
      agent: (t.agent ?? '').replace(/^[^:]*:/, '').trim().toLowerCase(),
      after: (t.after ?? []).filter(n => Number.isInteger(n) && n > 0),
    }))

const merge = (prev: Flow | null, input: ProgressInput): Flow => {
  // Never carry counters over from an earlier flow.
  const base = isNewFlow(prev, input) || !prev ? blank() : prev
  const tasks = cleanTasks(input.tasks) ?? base.tasks
  const total = Math.max(0, Math.round(input.total ?? (input.tasks ? tasks.length : base.total)))
  const phase = input.phase && PHASES.includes(input.phase) ? input.phase : base.phase
  return {
    ...base,
    title: input.title?.trim() || base.title,
    total,
    phase,
    isFinished: input.finished === true,
    tasks,
  }
}

// Opens the agents pane, or closes it when it is up; true when it ends up open.
async function togglePane($: EngineInterface): Promise<boolean> {
  const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  if (isOpen) {
    await $.ui.close({ id: PANE })
    return false
  }
  const at = await $.clock.now()
  await update($, now, () => at)
  await $.ui.open({ id: PANE, title: S.pane })
  return true
}

// Once per flow, so closing the pane sticks until the next flow.
async function autoOpen($: EngineInterface, key: string): Promise<void> {
  const p = await read($, panel)
  if (p.autoOpenedFor === key) return
  await update($, panel, prev => ({ ...prev, autoOpenedFor: key }))
  void $.ui.open({ id: PANE, title: S.pane })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.tool.register({
      name: 'progress',
      description:
        'Report /orchestrate progress to the progress bar above the prompt and the agents panel. ' +
        'Call it once the plan is set (title, tasks, phase "delegate"), on re-plans (tasks), and once at the end with finished: true. ' +
        'Done tasks and the verify phase follow the agents on their own: a task is done once its latest run finishes without error, and a reviewer launched once every task is done moves the bar to Verify. Fields left out keep their previous value.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short name of the overall goal, a few words.' },
          total: { type: 'integer', minimum: 0, description: 'Number of planned tasks; defaults to the length of tasks.' },
          phase: { type: 'string', enum: [...PHASES] },
          finished: { type: 'boolean', description: 'True once the final report is given.' },
          tasks: {
            type: 'array',
            description:
              'The planned Agent launches in order, numbered from 1 (not explorers or reviewers). Each title must equal the Agent tool `description` the task will be launched with, so the panel can match runs to tasks.',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'A few words; reused verbatim as the Agent description.' },
                agent: { type: 'string', enum: [...ROLES] },
                after: { type: 'array', items: { type: 'integer' }, description: 'Numbers of the tasks this one waits for.' },
              },
              required: ['title', 'agent'],
            },
          },
        },
      },
    })
    await $.command.register({
      name: 'agents-info',
      description: 'Show or hide the panel of subagents: running, finished and planned, with role, model, effort and time',
    })

    // Ticks the running agents' clocks; quiet when nothing runs.
    $.clock.every(1000, () => {
      void (async () => {
        const list = await read($, agents)
        if (!list.some(a => a.status === 'running')) return
        const at = await $.clock.now()
        await update($, now, () => at)
      })()
    })
    return started
  })

  on('command.run', { command: 'agents-info' }, async $ => {
    const isOpen = await togglePane($)
    return { text: isOpen ? S.opened : S.closed }
  })

  on('skill.prompt', async ($, e, next) => {
    const result = await next(e)
    if (e.skill.replace(/^[^:]*:/, '') !== 'orchestrate') return result
    await update($, flow, prev => (prev && !prev.isFinished ? prev : blank()))
    return { ...result, text: `${result.text}\n\n${ORCH_NOTE}` }
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as unknown as ProgressInput
    const prev = await read($, flow)
    if (isNewFlow(prev, input) && input.title !== undefined) {
      // A new flow starts with a clean list; agents still running stay.
      await update($, agents, list => list.filter(a => a.status === 'running'))
    }
    const f = await update($, flow, p => merge(p, input))
    if (f && input.tasks?.length) await autoOpen($, f.title)
    const list = await read($, agents)
    return { result: `ok: ${f ? label(f, runningOf(f, list), doneOf(f, list)) : S.plan}` }
  }).catch(() => ({ result: 'ok' }))

  // Fails open: a fault here never stops a launch, nor launches twice.
  on('agent.spawn', async ($, e, next) => {
    const role = roleOf(e.subagentType)
    const started = await next(e)
    if (started.deny !== undefined) return started

    const at = await $.clock.now()
    await update($, agents, list => {
      const round = 1 + list.filter(a => e.description && norm(a.description) === norm(e.description)).length
      const run: AgentRun = {
        id: started.agentId ?? e.tool_use_id,
        agentId: started.agentId,
        type: e.subagentType,
        description: e.description,
        model: started.model,
        status: 'running',
        startedAt: at,
        contextTokens: 0,
        contextMax: windowOf(started.model),
        tokens: 0,
        costUsd: 0,
        steps: 0,
        round,
      }
      return [...list.filter(a => a.id !== run.id), run].slice(-200)
    })
    await update($, now, () => at)

    // Safety net: an orchestrate launch shows the bar even when the orchestrator
    // has not reported, and moves its phase along.
    if (role !== 'other') {
      const list = await read($, agents)
      const f = await update($, flow, prev => {
        const base = prev && !prev.isFinished ? prev : blank()
        // Reviewers also check each piece while the rest still run; only one
        // launched once every planned task is done starts Verify.
        const phase: Phase =
          role === 'reviewer' && allDoneOf(base, list)
            ? 'verify'
            : role !== 'explorer' && base.phase === 'plan'
              ? 'delegate'
              : base.phase
        return { ...base, phase }
      })
      await autoOpen($, f?.title ?? DEFAULT_TITLE)
    }
    return started
  }).catch(($, e, next) => next(e))

  // Each model request of a subagent: live context, tokens and cost.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const agentId = e.agentId
    const usage = result.usage
    if (!agentId || !usage) return result

    const model = usage.model || e.model
    await update($, agents, list =>
      list.map(
        (a): AgentRun =>
          a.agentId !== agentId
            ? a
            : {
                ...a,
                model,
                effort: typeof e.effort === 'string' ? e.effort : a.effort,
                status: 'running',
                endedAt: undefined,
                contextTokens: tokensOf(usage),
                contextMax: windowOf(model),
                tokens: a.tokens + tokensOf(usage),
                costUsd: a.costUsd + costOf(model, usage),
                steps: a.steps + 1,
              },
      ),
    )
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const agentId = e.agentId
    if (agentId) {
      const at = await $.clock.now()
      const usage = e.usage
      await update($, agents, list =>
        list.map((a): AgentRun => {
          if (a.agentId !== agentId) return a
          // A run whose steps went unseen still gets the turn's own sum.
          const fallback =
            a.steps === 0 && usage
              ? { model: usage.model || a.model, tokens: tokensOf(usage), costUsd: costOf(usage.model || a.model, usage) }
              : {}
          return { ...a, status: e.reason === 'answer' ? 'done' : 'failed', endedAt: at, ...fallback }
        }),
      )
      await update($, now, () => at)
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, agents)
    const f = await read($, flow)
    const p: Panel = await read($, panel)
    const at = Math.max(await read($, now), ...list.map(a => a.startedAt), 0)

    const running = list.filter(a => a.status === 'running').reverse()
    const finished = list.filter(a => a.status !== 'running').reverse()
    const planned = plannedOf(f, list)
    const t = totals(list, at)
    // The pane's title says "Agents"; inside, only the flow's own name.
    const title = f && !f.isFinished ? f.title : ''

    const toggleCompact = (
      <Button
        key="compact"
        label={p.isCompact ? S.expand : S.collapse}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isCompact: !prev.isCompact }))}
      />
    )
    const toggleDone = (
      <Button
        key="done"
        label={`${p.isDoneCollapsed ? '▸' : '▾'} ${S.finished} · ${finished.length}`}
        plain
        onPress={() => update($, panel, prev => ({ ...prev, isDoneCollapsed: !prev.isDoneCollapsed }))}
      />
    )
    const isEmpty = list.length === 0 && planned.length === 0
    const summary = `≈${fmtCost(t.cost)}, ${fmtTokens(t.tokens)} ${S.tokensWord}, ${fmtTime(t.time)}`

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const W = Math.max(240, Math.min(900, (e.props.bodyColumns || 40) * 8 - 8))
      // A gap above each section, so its heading clears the divider of the row above.
      const section = (key: string, text: string) => (
        <Box key={key} marginTop={1}>
          <Text dimColor>{text}</Text>
        </Box>
      )

      if (p.isCompact) {
        return (
          <Box flexDirection="column" gap={1}>
            <Svg source={compactSvg(W, list, planned, t)} alt={`${list.length} ${S.agentsCount}, ${summary}`} width={W} height={COMPACT_H} />
            {toggleCompact}
          </Box>
        )
      }
      return (
        <Box flexDirection="column">
          <Svg source={headerSvg(W, title, t)} alt={title ? `${title}: ${summary}` : summary} width={W} height={headerHeight(title)} />
          {toggleCompact}
          {isEmpty && <Text dimColor>{S.empty}</Text>}
          {running.length > 0 && section('h-run', `${S.running} · ${running.length}`)}
          {running.map(a => (
            <Svg key={a.id} source={agentSvg(W, a, at)} alt={agentAlt(a)} width={W} height={AGENT_H} />
          ))}
          {finished.length > 0 && (
            <Box key="h-done" marginTop={1}>
              {toggleDone}
            </Box>
          )}
          {!p.isDoneCollapsed &&
            finished.map(a => (
              <Svg key={a.id} source={agentSvg(W, a, at)} alt={agentAlt(a)} width={W} height={AGENT_H} />
            ))}
          {planned.length > 0 && section('h-plan', `${S.planned} · ${planned.length}`)}
          {planned.map(pl => (
            <Svg key={`plan-${pl.n}`} source={plannedSvg(W, pl)} alt={`${pl.n}. ${pl.title}: ${S.isPlanned}`} width={W} height={PLANNED_H} />
          ))}
        </Box>
      )
    }

    // Terminal: the same content in text rows.
    const row = (a: AgentRun) => {
      const role = roleOf(a.type)
      const color = colorOf(costumeOf(a.type))
      const meta = [role === 'other' ? a.type : role, ...agentMeta(a).filter(m => m !== S.failed), fmtTime(elapsed(a, at))]
      return (
        <Box key={a.id} flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={color}>▣</Text>
            <Text bold wrap="truncate-end">
              {a.description || a.type}
            </Text>
            <Text color={a.status === 'failed' ? 'red' : a.status === 'done' ? 'green' : color}>{STATUS_GLYPH[a.status]}</Text>
          </Box>
          <Text dimColor wrap="truncate-end">
            {'  '}
            {meta.join(' · ')}
          </Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold wrap="truncate-end">
            {title}
          </Text>
          {toggleCompact}
        </Box>
        <Text dimColor>
          ≈{fmtCost(t.cost)} · {fmtTokens(t.tokens)} {S.tokensWord} · {fmtTime(t.time)}
        </Text>
        {p.isCompact ? (
          <Text wrap="truncate-end">
            {[...running, ...finished].map(a => (
              <Text key={a.id} color={colorOf(costumeOf(a.type))}>
                {STATUS_GLYPH[a.status]}{' '}
              </Text>
            ))}
            {planned.map(pl => (
              <Text key={`plan-${pl.n}`} dimColor>
                ◷{' '}
              </Text>
            ))}
          </Text>
        ) : (
          <Box flexDirection="column" marginTop={1}>
            {isEmpty && <Text dimColor>{S.empty}</Text>}
            {running.length > 0 && <Text dimColor>{S.running} · {running.length}</Text>}
            {running.map(row)}
            {finished.length > 0 && toggleDone}
            {!p.isDoneCollapsed && finished.map(row)}
            {planned.length > 0 && <Text dimColor>{S.planned} · {planned.length}</Text>}
            {planned.map(pl => {
              const role = isRole(pl.agent) ? pl.agent : 'other'
              return (
                <Box key={`plan-${pl.n}`} flexDirection="column" marginBottom={1}>
                  <Text dimColor wrap="truncate-end">
                    <Text color={colorOf(role)}>▢</Text> {pl.n}. {pl.title} ◷
                  </Text>
                  <Text dimColor wrap="truncate-end">
                    {'  '}
                    {role === 'other' ? pl.agent || role : role} · {plannedModel(role)}
                    {pl.after.length ? ` · ${S.after} ${pl.after.join(', ')}` : ''}
                  </Text>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const f = await read($, flow)
    if (f === null || e.props.hasSurvey) return next(e)

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, agents)
    const running = runningOf(f, list)
    const done = doneOf(f, list)
    const crew = list.length + plannedOf(f, list).length
    const isWorking = list.some(a => a.status === 'running')
    const crewButton = <Button key="crew" label={`×${crew}`} plain onPress={() => void togglePane($)} />
    const percent = `${Math.round(ratio(f, done) * 100)}%`
    const dismiss = <Button key="dismiss" label="✕" plain role="dismiss" onPress={() => update($, flow, () => null)} />

    // The terminal's table answers `'Svg' in ui` too, then draws it as an empty box.
    if (e.surface !== 'terminal' && 'Svg' in ui) {
      const { Svg } = ui
      // About 8 CSS px per reported column; the rest is the count, the dismiss
      // and their gaps. No floor above the slot: a row wider than it would wrap.
      const width = Math.max(180, Math.min(1600, (e.props.bodyColumns || 100) * 8 - 96))
      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Svg source={rowSvg(f, running, done, width, isWorking)} alt={`${f.title}: ${label(f, running, done)}, ${percent}`} width={width} height={H} />
          {crewButton}
          {dismiss}
        </Box>
      )
    }

    const cols = e.props.bodyColumns
    const titleW = Math.max(8, Math.min(30, f.title.length + 2, Math.floor(cols / 3)))
    const width = Math.max(6, Math.min(40, cols - titleW - 32))
    return (
      <Box flexDirection="row" gap={2}>
        <Box width={titleW} flexShrink={0}>
          <Text color={f.isFinished ? DONE : ACCENT}>● </Text>
          <Text wrap="truncate-end">{f.title}</Text>
        </Box>
        <Text color={f.isFinished ? DONE : ACCENT}>{barText(f, done, width)}</Text>
        <Text bold>{label(f, running, done)}</Text>
        <Text dimColor>{percent}</Text>
        <Text color={CLAY}>▣</Text>
        {crewButton}
        {dismiss}
      </Box>
    )
  })
}
