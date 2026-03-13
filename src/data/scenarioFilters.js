/**
 * Filter criteria for scenarios. Matches your schema: topic, difficulty, persona.
 * (tier exists on scenarios as optional metadata only; not used for filtering.)
 */

export const TOPICS = [
  { value: 'Leads', label: 'Leads' },
  { value: 'Quotes', label: 'Quotes' },
  { value: 'Scheduling', label: 'Scheduling' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Communication', label: 'Communication' },
  { value: 'Invoicing & Payments', label: 'Invoicing & Payments' },
  { value: 'Finance', label: 'Finance' },
  { value: 'App Integrations', label: 'App Integrations' },
]

export const DIFFICULTIES = [
  { value: 1, label: '1 (Basics)' },
  { value: 2, label: '2 (Workflow)' },
  { value: 3, label: '3 (Strategy/ROI)' },
]

export const PERSONAS = [
  { value: 'busy_bee', label: 'Busy Bee' },
  { value: 'micro_manager', label: 'Micro-Manager' },
  { value: 'burned_pro', label: 'Burned Pro' },
  { value: 'tech_rookie', label: 'Tech Rookie' },
]

/** Check if a scenario matches the current filter selections. */
export function scenarioMatchesFilters(scenario, filters) {
  if (!scenario) return false
  if (filters.topic?.length && scenario.topic != null && !filters.topic.includes(scenario.topic)) return false
  if (filters.difficulty?.length && scenario.difficulty != null && !filters.difficulty.includes(scenario.difficulty)) return false
  if (filters.persona?.length && scenario.persona != null && !filters.persona.includes(scenario.persona)) return false
  return true
}
