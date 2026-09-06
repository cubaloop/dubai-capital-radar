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
    try {
      const res = await fetch(`${API_BASE_URL}/radar/signals`);
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.signals)) return data.signals;
      return [];
    } catch {
      return [];
    }
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
  },

  // ─── UNIFIED CRM & DYNAMIC CAMPAIGNS ──────────────────────────────────────────

  async getCrmCampaigns() {
    const res = await fetch(`${API_BASE_URL}/crm/campaigns`);
    if (!res.ok) throw new Error('Failed to fetch CRM campaigns');
    return res.json();
  },

  async uploadExcelCampaign(formData: FormData) {
    const res = await fetch(`${API_BASE_URL}/crm/campaigns/upload-excel`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al subir archivo' }));
      throw new Error(err.detail || 'Error al subir campaña');
    }
    return res.json();
  },

  async getCampaignLeads(campaignId: string) {
    const res = await fetch(`${API_BASE_URL}/crm/campaigns/${campaignId}/leads`);
    if (!res.ok) throw new Error('Failed to fetch campaign leads');
    return res.json();
  },

  async sendLeadWhatsApp(leadId: string, payload?: { message?: string; image_path?: string }) {
    const res = await fetch(`${API_BASE_URL}/crm/leads/${leadId}/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    return res.json();
  },

  async startBatchDispatch(campaignId: string, delaySeconds: number = 8) {
    const res = await fetch(`${API_BASE_URL}/crm/campaigns/${campaignId}/batch/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delay_seconds: delaySeconds })
    });
    return res.json();
  },

  async controlBatchDispatch(campaignId: string, action: 'pause' | 'resume' | 'stop') {
    const res = await fetch(`${API_BASE_URL}/crm/campaigns/${campaignId}/batch/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    return res.json();
  },

  async getBatchStatus(campaignId: string) {
    const res = await fetch(`${API_BASE_URL}/crm/campaigns/${campaignId}/batch/status`);
    return res.json();
  },

  async getAllCrmLeads() {
    const res = await fetch(`${API_BASE_URL}/crm/all-leads`);
    if (!res.ok) throw new Error('Failed to fetch CRM leads');
    return res.json();
  },

  async patchCrmLead(leadId: string, updates: Record<string, any>) {
    const res = await fetch(`${API_BASE_URL}/crm/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async addLeadNote(leadId: string, note: { author?: string; content: string; type?: string }) {
    const res = await fetch(`${API_BASE_URL}/crm/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    return res.json();
  },

  async getLeadNotes(leadId: string) {
    const res = await fetch(`${API_BASE_URL}/crm/leads/${leadId}/notes`);
    return res.json();
  },

  async updateCampaignAiPrompt(campaignId: string, promptInstructions: string, regeneratePendingOnly: boolean = true) {
    const res = await fetch(`${API_BASE_URL}/crm/campaigns/${campaignId}/update-ai-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt_instructions: promptInstructions,
        regenerate_pending_only: regeneratePendingOnly
      })
    });
    if (!res.ok) throw new Error('Error al actualizar el prompt del bot');
    return res.json();
  },

  async updateLeadCustomMessage(leadId: string, message: string) {
    const res = await fetch(`${API_BASE_URL}/crm/leads/${leadId}/message`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error('Error al actualizar el mensaje del lead');
    return res.json();
  }
};

