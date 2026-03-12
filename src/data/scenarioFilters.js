/**
 * Filter criteria for scenarios. Matches your schema: pillar, tier, difficulty, persona.
 */

export const PILLARS = [
  { value: 1, label: 'Leads' },
  { value: 2, label: 'Quotes' },
  { value: 3, label: 'Scheduling' },
  { value: 4, label: 'Operations' },
  { value: 5, label: 'Communication' },
  { value: 6, label: 'Invoicing & Payments' },
  { value: 7, label: 'Finance' },
  { value: 8, label: 'App Integrations' },
]

export const PLAN_TIERS = [
  { value: 'connect', label: 'Connect' },
  { value: 'grow', label: 'Grow' },
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
  if (filters.pillar?.length && scenario.pillar != null && !filters.pillar.includes(scenario.pillar)) return false
  if (filters.tier?.length && scenario.tier != null && !filters.tier.includes(scenario.tier)) return false
  if (filters.difficulty?.length && scenario.difficulty != null && !filters.difficulty.includes(scenario.difficulty)) return false
  if (filters.persona?.length && scenario.persona != null && !filters.persona.includes(scenario.persona)) return false
  return true
}
