export interface MonetizationPlacement {
    type: 'Rewarded Ad' | 'Interstitial' | 'Banner' | 'IAP Offer' | 'Bunder/Pass Offer';
    trigger: string;
    rationale: string;
}

export interface ReportBlock {
  type: 'header' | 'key-value' | 'analysis-box' | 'list' | 'metrics';
  title: string;
  data: unknown;
}

export interface DynamicSubmission {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  classCode?: string;
  gameTitle: string;
  genre?: string[];
  audience?: string;
  mechanic?: string;
  playerGoal?: string;
  rewardMoment?: string;
  monetizationTiming?: string;
  pressurePoint?: string;
  platform?: string;
  monetization?: string[];
  aiEnabled?: boolean;
  savedToDashboard?: boolean;
  timestamp: string;
  blocks: ReportBlock[];
}
