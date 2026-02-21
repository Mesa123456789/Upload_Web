export interface FunnelMetrics {
  tapTime: string;
  rewardTime: string;
  ctaShown: string;
  completionRate: string;
}

export interface RecommendationItem {
  title: string;
  description?: string;
  type: "success" | "warning";
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface FlowStep {
  label: string;
  variant?: "normal" | "warning" | "danger";
}

export interface GraphPoint {
  label: string;
  expected: number;
  observed: number;
}

export interface GraphMetric {
  value: string;
  label: string;
}

export interface CritiqueData {
  funnel: FunnelMetrics;
  recommendations: RecommendationItem[];
  checklist: ChecklistItem[];
  expectedFlow: FlowStep[];
  observedFlow: FlowStep[];
  graph: GraphPoint[];
  graphMetrics: GraphMetric[];
  highlights: {
    risk: string;
    consistency: string;
    hook: string;
    reward: string;
    cta: string;
  };
  highPressure: {
    warning1: string;
    warning2: string;
  };
}
