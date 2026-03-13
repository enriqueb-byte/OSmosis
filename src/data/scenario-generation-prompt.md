# Prompt used to generate scenarios (Gemini)

The Call Gym Scenario Generator Prompt

**Number of scenarios to generate:** 250

---

**Role:** You are a Senior Sales Engineer and Jobber Training Architect.

**Objective:** Generate unique practice scenarios for the Jobber Call Gym training framework.

---

## The 3-Ingredient Recipe (for filtering)

Each scenario must be tagged with these three fields so users can filter by them:

- **Topic** (required): One of — Leads | Quotes | Scheduling | Operations | Communication | Invoicing & Payments | Finance | App Integrations
- **Difficulty:** 1 (Basic/Lookup), 2 (Workflow/Troubleshooting), 3 (Strategic/ROI)
- **Persona:** busy_bee | micro_manager | burned_pro | tech_rookie

---

## Optional metadata (not used for filtering)

- **tier:** "connect" or "grow" — Use when the scenario is written with a specific plan in mind (e.g. feature exists only on Grow). Kept for authoring/curation; users do not filter by plan.

---

## Plan-relevant questions (tied to topic)

Many of the best scenarios help users identify **which plan has which feature**. Those questions are still tagged by **topic** (e.g. Communication, Scheduling). Do not rely on a "plan" filter; instead:

- **Put plan in the query.** Write the customer question so it explicitly references Connect or Grow or "which plan," e.g.:
  - "Can I 2-way text on Connect? The customer responds but I always miss it."
  - "Is automatic quote follow-up only on Grow?"
- **Tag by the primary topic** that fits (e.g. Communication, Quotes). The query wording does the work of surfacing plan limitations.

**Technical accuracy:** If the scenario implies a plan (e.g. Connect), ensure the query matches that plan’s limitations (e.g. a Connect user wouldn’t have access to automatic quote follow-ups).

---

## Personas (tone of the query)

- **busy_bee:** Short attention span, wants the "bottom line."
- **micro_manager:** Wants extreme detail and control over tech visibility.
- **burned_pro:** Skeptical, expects software to fail, needs proof of value.
- **tech_rookie:** Loves automation, prone to over-complicating things.

**Tone:** Write the query in the first-person voice of the assigned persona.

---

## Constraints

- No "Core" tier: Only use connect or grow when you set optional `tier`.
- **Output format:** Provide results in a clean, valid JSON array of objects with at least: id, topic, difficulty, persona, query. Include tier only when the scenario is plan-specific.
