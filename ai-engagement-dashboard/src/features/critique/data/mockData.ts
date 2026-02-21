import type { CritiqueData } from "../types";

export const mockData: CritiqueData = {
  funnel: {
    tapTime: "0.9s",
    rewardTime: "3.0s",
    ctaShown: "3.8s",
    completionRate: "18%",
  },

  recommendations: [
    { title: "Hook Effective", type: "success" },
    {
      title: "CTA Too Early:",
      description: "Shown before reward peak.",
      type: "warning",
    },
    {
      title: "High Pressure:",
      description: "Pushed CTA too soon.",
      type: "warning",
    },
  ],

  checklist: [
    { label: "Delay CTA until after first reward", checked: true },
    { label: "Reduce CTA prominence", checked: true },
    { label: 'Add a "Skip" option', checked: true },
  ],

  expectedFlow: [
    { label: "Hook" },
    { label: "First Tap" },
    { label: "Reward" },
    { label: "CTA" },
    { label: "CTA" },
    { label: "CTA Soon", variant: "warning" },
  ],

  observedFlow: [
    { label: "Hook" },
    { label: "First Tap (Late)", variant: "warning" },
    { label: "Reward Delayed", variant: "warning" },
    { label: "CTA" },
    { label: "CTA Fails", variant: "danger" },
  ],

  graph: [
    { label: "Tap", expected: 2, observed: 1.8 },
    { label: "+3s", expected: 4, observed: 3.5 },
    { label: "+6s", expected: 6, observed: 5 },
    { label: "+9s", expected: 5, observed: 4 },
    { label: "CTA", expected: 3, observed: 2.5 },
    { label: "End", expected: 2, observed: 1.5 },
  ],

  graphMetrics: [
    { value: "Δ +1.3s", label: "First Tap" },
    { value: "Δ 2.0s", label: "Completion Rate" },
    { value: "▼ -6%", label: "Retarget Ad" },
    { value: "-1.8%", label: "Engagement Delay" },
    { value: "Δ 1.3s", label: "Improved" },
  ],

  highlights: {
    risk: "Low",
    consistency: "High",
    hook: "Hook Clarity: Clear & Fun Start",
    reward: "Reward Impact: Positive Peak",
    cta: "CTA Strategy: Balanced Timing",
  },

  highPressure: {
    warning1: "CTA shown too early: Consider delaying until after the reward.",
    warning2: "High pressure risk: Avoid pushing players.",
  },
};
