export interface MonetizationPlacement {
    type: 'Rewarded Ad' | 'Interstitial' | 'Banner' | 'IAP Offer' | 'Bunder/Pass Offer';
    trigger: string;
    rationale: string;
}

export interface ReportBlock {
  type: 'header' | 'key-value' | 'analysis-box' | 'list' | 'metrics';
  title: string;
  data: any; 
}

export interface DynamicSubmission {
  userId: string;
  gameTitle: string;
  timestamp: string;
  blocks: ReportBlock[];
}
