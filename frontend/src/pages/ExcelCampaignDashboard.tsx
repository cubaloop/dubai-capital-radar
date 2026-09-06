import React, { useState, useEffect } from 'react';
import { CrmCampaign, CrmLead } from '../types';
import { apiService } from '../services/api';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Filter,
  RefreshCw,
  Layers,
  Users,
  Tag,
  Calendar,
  Eye,
  Send,
  Sparkles,
  AlertCircle,
  FileText
} from 'lucide-react';

export const ExcelCampaignDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CrmCampaign | null>(null);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  // Edit Campaign State
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Edit Lead Modal State
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [leadForm, setLeadForm] = useState<{
    name: string;
    phone: string;
    email: string;
    objective: string;
    timeline: string;
    personalized_message: string;
    crm_status: import('../types').CrmLeadStatus;
  }>({
    name: '',
    phone: '',
    email: '',
    objective: '',
    timeline: '',
    personalized_message: '',
    crm_status: 'CREATED'
  });

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCampaignName, setUploadCampaignName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('España');
  const [uploadContext, setUploadContext] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const res = await apiService.getCrmCampaigns();
      if (res?.campaigns) {
        setCampaigns(res.campaigns);
        if (!selectedCampaign && res.campaigns.length > 0) {
          setSelectedCampaign(res.campaigns[0]);
        } else if (selectedCampaign) {
          const updated = res.campaigns.find((c: CrmCampaign) => c.id === selectedCampaign.id);
          if (updated) setSelectedCampaign(updated);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeadsForCampaign = async (cid: string) => {
    try {
      const res = await apiService.getCampaignLeads(cid);
      if (res?.leads) {
        setLeads(res.leads);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchLeadsForCampaign(selectedCampaign.id);
    }
  }, [selectedCampaign]);

  const handleStartEditCampaign = (camp: CrmCampaign) => {
    setEditingCampaignId(camp.id);
    setEditName(camp.name);
    setEditCategory(camp.category || 'General');
    setEditDescription(camp.description || '');
  };

  const handleSaveCampaign = async (cid: string) => {
    try {
      await apiService.updateCampaignMeta(cid, {
        name: editName,
        category: editCategory,
        description: editDescription
      });
      setEditingCampaignId(null);
      setStatusAlert({ type: 'success', text: 'Campaña y etiqueta actualizadas correctamente.' });
      fetchCampaigns();
    } catch (e) {
      setStatusAlert({ type: 'error', text: 'Error al actualizar la campaña.' });
    }
  };

  const handleDeleteCampaign = async (cid: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta campaña y todos sus leads asociados permanentemente?')) return;
    try {
      await apiService.deleteCampaign(cid);
      setStatusAlert({ type: 'success', text: 'Campaña eliminada correctamente.' });
      setSelectedCampaign(null);
      setLeads([]);
      fetchCampaigns();
    } catch (e) {
      setStatusAlert({ type: 'error', text: 'Error al eliminar campaña.' });
    }
  };

  const handleDeleteLead = async (lid: string) => {
    if (!window.confirm('¿Eliminar este lead de la campaña?')) return;
    try {
      await apiService.deleteLead(lid);
      setLeads(prev => prev.filter(l => l.id !== lid));
      setStatusAlert({ type: 'success', text: 'Lead eliminado correctamente.' });
      fetchCampaigns();
    } catch (e) {
      setStatusAlert({ type: 'error', text: 'Error al eliminar lead.' });
    }
  };

  const handleStartEditLead = (lead: CrmLead) => {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      objective: lead.objective || '',
      timeline: lead.timeline || '',
      personalized_message: lead.personalized_message || '',
      crm_status: lead.crm_status || 'CREATED'
    });
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    try {
      await apiService.patchCrmLead(editingLead.id, {
        name: leadForm.name,
        email: leadForm.email,
        objective: leadForm.objective,
        timeline: leadForm.timeline,
        crm_status: leadForm.crm_status
      });
      if (leadForm.personalized_message !== editingLead.personalized_message) {
        await apiService.updateLeadCustomMessage(editingLead.id, leadForm.personalized_message);
      }
      setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, ...leadForm } : l));
      setEditingLead(null);
      setStatusAlert({ type: 'success', text: 'Datos del lead actualizados en base de datos.' });
    } catch (e) {
      setStatusAlert({ type: 'error', text: 'Error al guardar los cambios del lead.' });
    }
  };

  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadCampaignName) {
      setStatusAlert({ type: 'error', text: 'Por favor selecciona un archivo Excel (.xlsx/.csv) y escribe un nombre.' });
      return;
    }
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('campaign_name', uploadCampaignName.trim());
      formData.append('category', uploadCategory.trim());
      if (uploadContext) {
        formData.append('campaign_context', uploadContext.trim());
      }

      const res = await apiService.uploadExcelCampaign(formData);
      if (res?.success) {
        setIsUploadOpen(false);
        setUploadFile(null);
        setUploadCampaignName('');
        setUploadContext('');
        setStatusAlert({ type: 'success', text: 'Excel importado con éxito.' });
        fetchCampaigns();
      }
    } catch (e) {
      setStatusAlert({ type: 'error', text: 'Error al procesar el archivo Excel.' });
    } finally {
      setIsUploading(false);
    }
  };

  const categories = Array.from(new Set(campaigns.map(c => c.category || 'General')));

  const filteredLeads = leads.filter(l => {
    const matchSearch = searchTerm === '' ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif-luxury font-black text-xl sm:text-2xl tracking-wide text-white flex items-center gap-2">
                ADMINISTRADOR DE CAMPAÑAS & EXCELS
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Carga, actualiza, renombra y gestiona archivos de leads con persistencia Supabase
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-slate-950 font-bold text-xs font-mono shadow-md shadow-gold-500/20 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Cargar Nuevo Excel / Leads</span>
          </button>

          <button
            onClick={fetchCampaigns}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
            title="Recargar"
          >
            <RefreshCw className={isLoading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          </button>
        </div>
      </div>

      {statusAlert && (
        <div className={`p-4 rounded-2xl border text-xs font-mono flex items-center justify-between ${statusAlert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <span>{statusAlert.text}</span>
          <button onClick={() => setStatusAlert(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main 2-Column Full Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Campaigns & Excels List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-luxury font-bold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold-600" />
                <span>Campañas Registradas ({campaigns.length})</span>
              </h3>
            </div>

            {/* Campaign Cards List */}
            <div className="space-y-3">
              {campaigns.map((camp) => {
                const isSelected = selectedCampaign?.id === camp.id;
                const isEditing = editingCampaignId === camp.id;

                return (
                  <div
                    key={camp.id}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected ? 'bg-amber-50/70 border-gold-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => !isEditing && setSelectedCampaign(camp)}
                  >
                    {isEditing ? (
                      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nombre de campaña"
                          className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-gold-500"
                        />
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          placeholder="Etiqueta / País (Ej: España, USA, México)"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-900 outline-none focus:border-gold-500"
                        />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => setEditingCampaignId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSaveCampaign(camp.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                            {camp.name}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditCampaign(camp);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                              title="Editar nombre y etiqueta"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCampaign(camp.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              title="Eliminar campaña"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            🏷️ {camp.category || 'General'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {camp.total_leads || 0} Leads
                          </span>
                          <span className="text-[11px] font-mono text-emerald-600 font-bold ml-auto">
                            {camp.sent_leads || 0} Enviados
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Leads Table & Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
            {selectedCampaign ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="font-serif-luxury font-bold text-lg text-slate-900">
                      {selectedCampaign.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {filteredLeads.length} leads listados • Etiqueta: <span className="font-bold text-slate-700">{selectedCampaign.category || 'General'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre o teléfono..."
                        className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500 w-48 sm:w-64"
                      />
                    </div>
                  </div>
                </div>

                {/* Leads Interactive Table */}
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 text-slate-600 font-mono text-[11px] border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                        <th className="py-3 px-3.5 font-bold">#</th>
                        <th className="py-3 px-3.5 font-bold">Nombre</th>
                        <th className="py-3 px-3.5 font-bold">Teléfono</th>
                        <th className="py-3 px-3.5 font-bold">Objetivo</th>
                        <th className="py-3 px-3.5 font-bold">Estado WhatsApp</th>
                        <th className="py-3 px-3.5 font-bold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredLeads.map((lead, idx) => (
                        <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono text-slate-400 text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-900">
                            {lead.name}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-slate-600">
                            {lead.phone}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600">
                            {lead.objective || 'Inversión'}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              lead.whatsapp_status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {lead.whatsapp_status === 'sent' ? '✓ Enviado' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditLead(lead)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                                title="Editar lead"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                title="Eliminar lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-slate-400 font-mono text-xs">
                Selecciona una campaña a la izquierda o carga un archivo Excel nuevo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Lead Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <h3 className="font-serif-luxury font-bold text-sm sm:text-base text-gold-300">
                Editar Datos del Lead: {editingLead.name}
              </h3>
              <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre</label>
                  <input
                    type="text"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Objetivo</label>
                  <input
                    type="text"
                    value={leadForm.objective}
                    onChange={(e) => setLeadForm({ ...leadForm, objective: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Estado CRM</label>
                  <select
                    value={leadForm.crm_status}
                    onChange={(e) => setLeadForm({ ...leadForm, crm_status: e.target.value as import('../types').CrmLeadStatus })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500 bg-white"
                  >
                    <option value="CREATED">Nuevo (Created)</option>
                    <option value="CONTACTED">Contactado</option>
                    <option value="FOLLOW_UP">Seguimiento (Follow-up)</option>
                    <option value="APPOINTMENT">Cita Agendada (Appointment)</option>
                    <option value="RESERVATION">Reserva / EOI (Reservation)</option>
                    <option value="CLOSED">Cerrado / Ganado</option>
                    <option value="LOST">Perdido / Descartado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mensaje Personalizado de WhatsApp (IA)
                </label>
                <textarea
                  rows={4}
                  value={leadForm.personalized_message}
                  onChange={(e) => setLeadForm({ ...leadForm, personalized_message: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500 font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold text-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload New Excel Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <h3 className="font-serif-luxury font-bold text-sm sm:text-base text-gold-300 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Cargar Nuevo Archivo Excel / CSV</span>
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadExcel} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Archivo Excel o CSV
                </label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gold-500 file:text-slate-950 hover:file:bg-gold-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre de la Campaña
                </label>
                <input
                  type="text"
                  required
                  value={uploadCampaignName}
                  onChange={(e) => setUploadCampaignName(e.target.value)}
                  placeholder="Ej: Inversionistas Madrid VIP Septiembre"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Etiqueta / Categoría
                </label>
                <input
                  type="text"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  placeholder="Ej: España, Miami, México, Colombia"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contexto / Instrucciones para la IA (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={uploadContext}
                  onChange={(e) => setUploadContext(e.target.value)}
                  placeholder="Instrucciones del evento, ofertas o mensaje clave..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <span>Procesando e Importando...</span>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Cargar e Importar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
