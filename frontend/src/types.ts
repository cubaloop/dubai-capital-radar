export interface LiquiditySignal {
  id: string;
  signal_type: 'crypto_whale' | 'tech_exit' | 'tax_reform' | 'venture_funding' | 'hnwi_relocation';
  title: string;
  entity_name: string;
  source_country: string;
  estimated_liquidity_usd: number;
  confidence_score: number;
  description: string;
  detected_at: string;
  tags: string[];
  source_url?: string;
  target_prospect_role?: string;
}

export interface ProspectProfile {
  id: string;
  name: string;
  email: string;
  role_title: string;
  company_name: string;
  country: string;
  linkedin_url?: string;
  estimated_net_worth_usd: number;
  liquidity_event: string;
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  interests: string[];
  matched_projects: string[];
  status: 'new' | 'dossier_generated' | 'contacted' | 'replied' | 'booked';
}

export interface TaxComparison {
  home_country: string;
  annual_income_usd: number;
  capital_gains_usd: number;
  home_tax_liability_usd: number;
  dubai_tax_liability_usd: number;
  annual_tax_savings_usd: number;
  five_year_savings_usd: number;
  effective_home_tax_rate: number;
  dubai_effective_tax_rate: number;
  golden_visa_eligible: boolean;
  recommended_investment_aed: number;
  recommended_investment_usd: number;
}

export interface RealEstateProject {
  id: string;
  name: string;
  developer: string;
  location: string;
  starting_price_aed: number;
  starting_price_usd: number;
  completion_date: string;
  project_type: string;
  projected_net_yield: number;
  five_year_capital_gain: number;
  payment_plan: string;
  dld_escrow_number: string;
  golden_visa_eligible: boolean;
  images: string[];
  key_features: string[];
  description: string;
}

export interface DossierResponse {
  dossier_id: string;
  slug: string;
  prospect: ProspectProfile;
  tax_analysis: TaxComparison;
  recommended_projects: RealEstateProject[];
  investment_thesis_narrative: string;
  golden_visa_roadmap: Array<{ step: string; timeline: string; description: string }>;
  recommended_asset_allocation: Record<string, number>;
  calendly_link: string;
  whatsapp_direct_link: string;
  created_at: string;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  prospect_id: string;
  prospect_name: string;
  prospect_email: string;
  channel: string;
  subject_line: string;
  body_content: string;
  status: 'draft' | 'sent' | 'opened' | 'clicked' | 'replied';
  dossier_slug: string;
  sent_at?: string;
  last_response?: string;
  ai_sentiment?: string;
}

export interface TriageResponse {
  sentiment: string;
  suggested_reply: string;
  action_required: string;
  priority_level: string;
}
