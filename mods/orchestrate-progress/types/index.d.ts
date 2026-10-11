export type Phase = 'plan' | 'delegate' | 'verify'

export type PlannedTask = {
  title: string
  /** The orchestrate agent type the piece goes to: `worker`, `tester`, ... */
  agent: string
  after: number[]
}

export type Flow = {
  title: string
  total: number
  phase: Phase
  isFinished: boolean
  tasks: PlannedTask[]
}

export type AgentStatus = 'running' | 'done' | 'failed'

export type AgentRun = {
  id: string
  agentId?: string
  type: string
  description: string
  model: string
  /** As the engine reported it; the panel falls back to the role's default. */
  effort?: string
  status: AgentStatus
  startedAt: number
  endedAt?: number
  contextTokens: number
  contextMax: number
  tokens: number
  costUsd: number
  steps: number
  round: number
}

export type Panel = {
  isCompact: boolean
  isDoneCollapsed: boolean
  autoOpenedFor: string
}

declare module 'claude-code' {
  interface PluginState {
    'orchestrate-progress': {
      flow: Flow | null
      agents: AgentRun[]
      panel: Panel
      now: number
    }
  }
}
