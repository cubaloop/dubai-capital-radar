import {
  LiquiditySignal,
  ProspectProfile,
  DossierResponse,
  OutreachCampaign,
  RealEstateProject,
  TriageResponse,
  TaxComparison
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiService = {
  async getHealth() {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.json();
  },

  async getAutopilotStatus(): Promise<{ autopilot_enabled: boolean }> {
    const res = await fetch(`${API_BASE_URL}/autopilot/status`);
    if (!res.ok) throw new Error('Failed to get autopilot status');
    return res.json();
  },

  async toggleAutopilot(): Promise<{ autopilot_enabled: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/autopilot/toggle`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle autopilot');
    return res.json();
  },

  async getSignals(): Promise<LiquiditySignal[]> {
    const res = await fetch(`${API_BASE_URL}/radar/signals`);
    if (!res.ok) throw new Error('Failed to fetch signals');
    return res.json();
  },

  async triggerRadarScan(): Promise<LiquiditySignal> {
    const res = await fetch(`${API_BASE_URL}/radar/scan`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger scan');
    return res.json();
  },

  async getProspects(): Promise<ProspectProfile[]> {
    const res = await fetch(`${API_BASE_URL}/prospects`);
    if (!res.ok) throw new Error('Failed to fetch prospects');
    return res.json();
  },

  async enrichSignal(signalId: string): Promise<ProspectProfile> {
    const res = await fetch(`${API_BASE_URL}/prospects/enrich-signal/${signalId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to enrich signal');
    return res.json();
  },

  async generateDossier(prospectId: string): Promise<DossierResponse> {
    const res = await fetch(`${API_BASE_URL}/dossier/generate/${prospectId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to generate dossier');
    return res.json();
  },

  async getDossier(slugOrId: string): Promise<DossierResponse> {
    const res = await fetch(`${API_BASE_URL}/dossier/${slugOrId}`);
    if (!res.ok) throw new Error('Failed to fetch dossier');
    return res.json();
  },

  async getTaxComparison(country: string, income: number, capitalGains: number): Promise<TaxComparison> {
    const params = new URLSearchParams({
      country,
      income: income.toString(),
      capital_gains: capitalGains.toString()
    });
    const res = await fetch(`${API_BASE_URL}/financial/tax-comparison?${params}`);
    if (!res.ok) throw new Error('Failed to fetch tax calculation');
    return res.json();
  },

  async getSupportedCountries(): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/financial/supported-countries`);
    if (!res.ok) throw new Error('Failed to fetch countries');
    return res.json();
  },

  async getInventory(): Promise<RealEstateProject[]> {
    const res = await fetch(`${API_BASE_URL}/inventory`);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async getCampaigns(): Promise<OutreachCampaign[]> {
    const res = await fetch(`${API_BASE_URL}/campaigns`);
    if (!res.ok) throw new Error('Failed to fetch campaigns');
    return res.json();
  },

  async launchCampaign(prospectId: string): Promise<OutreachCampaign> {
    const res = await fetch(`${API_BASE_URL}/campaigns/launch/${prospectId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to launch campaign');
    return res.json();
  },

  async classifyTriage(senderName: string, prospectId: string, message: string): Promise<TriageResponse> {
    const res = await fetch(`${API_BASE_URL}/triage/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_name: senderName,
        prospect_id: prospectId,
        message
      })
    });
    if (!res.ok) throw new Error('Failed to classify response');
    return res.json();
  }
};
