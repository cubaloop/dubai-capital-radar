import React from 'react';
import { 
  BarChart3, 
  Users, 
  Send, 
  FileSpreadsheet, 
  MessageSquare, 
  Building, 
  CreditCard, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Plane,
  X
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  onOpenWhatsAppModal: () => void;
  onOpenAgencyModal: () => void;
  onOpenLicenseModal: () => void;
  currentUser?: {
    email: string;
    name: string;
    role: string;
    agencyName: string;
    messagesLimit?: number;
    messagesUsed?: number;
    plan?: string;
  };
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  action?: () => void;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isOpenMobile,
  setIsOpenMobile,
  onOpenWhatsAppModal,
  onOpenAgencyModal,
  onOpenLicenseModal,
  currentUser
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navGroups: NavGroup[] = [
    {
      title: 'ANALÍTICA',
      items: [
        { label: 'Dashboard', path: '/analytics', icon: <BarChart3 className="w-5 h-5" /> },
      ]
    },
    {
      title: 'OUTREACH & CRM',
      items: [
        { label: 'CRM Leads', path: '/crm', icon: <Users className="w-5 h-5" /> },
        { label: 'Campañas IA', path: '/campaigns', icon: <Send className="w-5 h-5" /> },
        { label: 'Importar Excel', path: '/excels', icon: <FileSpreadsheet className="w-5 h-5" /> },
      ]
    },
    {
      title: 'CONECTIVIDAD',
      items: [
        { 
          label: 'WhatsApp Gateway', 
          action: onOpenWhatsAppModal, 
          icon: <MessageSquare className="w-5 h-5" />,
          badge: 'Online'
        },
      ]
    },
    {
      title: 'CONFIGURACIÓN',
      items: [
        { label: 'Mi Agencia', action: onOpenAgencyModal, icon: <Building className="w-5 h-5" /> },
        { label: 'Planes & Cuotas', action: onOpenLicenseModal, icon: <CreditCard className="w-5 h-5" /> },
      ]
    }
  ];

  const handleNavigate = (path?: string, action?: () => void) => {
    if (action) {
      action();
    } else if (path) {
      navigate(path);
    }
    setIsOpenMobile(false);
  };

  const isDemo = localStorage.getItem('outpilot_demo_mode') === 'true';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r
          bg-[#FFFFFF] dark:bg-[#28243D] border-[rgba(58,53,65,0.12)] dark:border-[rgba(231,227,252,0.12)]
          shadow-lg lg:shadow-none
          ${isCollapsed ? 'w-[74px]' : 'w-64'}
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[rgba(58,53,65,0.08)] dark:border-[rgba(231,227,252,0.08)]">
          <div 
            onClick={() => navigate('/crm')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8C57FF] to-[#6A3EC4] flex items-center justify-center text-white shadow-md shadow-[#8C57FF]/30 shrink-0">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-slate-100 font-sans">
                    Outpilot
                  </span>
                  {isDemo && (
                    <span className="text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase">
                      Demo
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 -mt-0.5 font-medium">Enterprise CRM</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[11px] font-bold text-slate-400/80 dark:text-slate-500 uppercase tracking-wider mb-2">
                  {group.title}
                </div>
              )}
              {group.items.map((item, iIdx) => {
                const isActive = item.path ? location.pathname === item.path : false;
                return (
                  <button
                    key={iIdx}
                    onClick={() => handleNavigate(item.path, item.action)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 relative group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#8C57FF] to-[#7E4EE6] text-white shadow-md shadow-[#8C57FF]/25 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-[#8C57FF]/8 dark:hover:bg-[#8C57FF]/12 hover:text-[#8C57FF] dark:hover:text-[#A277FF]'
                    }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-[#8C57FF] dark:group-hover:text-[#A277FF]'}`}>
                      {item.icon}
                    </span>

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Quota & Agency Footer */}
        {!isCollapsed && (
          <div className="p-3 border-t border-[rgba(58,53,65,0.08)] dark:border-[rgba(231,227,252,0.08)]">
            <div className="p-3 rounded-xl bg-[#F4F5FA] dark:bg-[#201D34] border border-[rgba(58,53,65,0.06)] dark:border-[rgba(231,227,252,0.06)]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#8C57FF]" />
                  Cuota Mensajes IA
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#8C57FF]/15 text-[#8C57FF]">
                  {currentUser?.plan?.toUpperCase() || 'FREE'}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
                <div 
                  className="bg-gradient-to-r from-[#8C57FF] to-[#56CA00] h-full rounded-full transition-all duration-300"
                  style={{
                    width: currentUser?.messagesLimit && currentUser.messagesLimit !== -1 
                      ? `${Math.min(100, Math.max(5, ((currentUser.messagesUsed || 0) / currentUser.messagesLimit) * 100))}%`
                      : '20%'
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Restantes:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {currentUser?.messagesLimit && currentUser.messagesLimit !== -1 
                    ? `${Math.max(0, currentUser.messagesLimit - (currentUser.messagesUsed || 0))} / ${currentUser.messagesLimit}`
                    : '500 libres'}
                </span>
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
