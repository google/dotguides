/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { multiselect, select } from "@clack/prompts";
import type { AgentAdapter } from "./agents/types.js";
import { Package } from "./package.js";
import type { ContextBudget } from "./settings.js";

export async function selectContextBudget(
  initialValue: ContextBudget = "medium",
): Promise<ContextBudget | null> {
  const selected = await select({
    message:
      "Select a context budget for how much content can be included in your agent's sytem prompt:",
    options: [
      {
        value: "low",
        label: "Low",
        hint: "< ~5K tokens",
      },
      {
        value: "medium",
        label: "Medium",
        hint: "< ~15K tokens",
      },
      {
        value: "high",
        label: "High",
        hint: "< ~30K tokens",
      },
    ],
    initialValue,
  });

  if (typeof selected === "symbol") {
    return null;
  }

  return selected as ContextBudget;
}

export async function selectPackages(
  allPackages: Package[],
  enabledPackages: Package[],
  newPackages: Package[],
): Promise<Package[] | null> {
  if (allPackages.length === 0) {
    return [];
  }

  const showNew = newPackages.length < allPackages.length;
  const newPackageNames = new Set(newPackages.map((p) => p.name));

  const options = allPackages
    .map((p) => {
      const description = p.guides.find((g) => g.config.name === "usage")
        ?.config.description;
      const isNew = newPackageNames.has(p.name);
      const newHint = showNew && isNew ? "new!" : "";
      const hint = [newHint, description].filter(Boolean).join(" ");
      return {
        value: p,
        label: p.name,
        hint,
        isNew,
      };
    })
    .sort((a, b) => {
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      return a.label.localeCompare(b.label);
    });

  const selected = await multiselect({
    message: "Select packages to enable guidance for:",
    options,
    initialValues: enabledPackages,
    required: false,
  });

  if (typeof selected === "symbol") {
    return null;
  }

  return selected as Package[];
}

export async function selectAgent(
  agents: AgentAdapter[],
  initialValue?: AgentAdapter,
): Promise<AgentAdapter | "other" | null> {
  if (agents.length === 0) {
    return null;
  }
  if (agents.length === 1) {
    return agents[0] ?? null;
  }

  const options: {
    value: AgentAdapter | "other";
    label: string;
    hint?: string;
  }[] = [
    ...agents.map((a) => ({
      value: a,
      label: a.title,
    })),
    {
      value: "other",
      label: "Other",
      hint: "(manual setup)",
    },
  ];

  const selected = await select({
    message: "Select a coding agent to configure:",
    options,
    initialValue,
  });

  if (selected === null) {
    return null;
  }

  if (typeof selected === "symbol" || selected === undefined) {
    return null;
  }

  return selected;
}
