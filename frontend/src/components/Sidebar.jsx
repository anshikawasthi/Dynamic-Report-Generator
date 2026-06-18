const NAV = [
  {
    group: "Main",
    items: [
      { id: "dashboard", icon: "dashboard", label: "Dashboard" },
      { id: "kpi-catalog", icon: "kpi", label: "KPI Catalog" },
    ],
  },
  {
    group: "Data Modules",
    items: [
      { id: "contracts", icon: "contracts", label: "Contracts", badge: "3" },
      { id: "assets", icon: "assets", label: "Assets", badge: "12" },
      { id: "invoices", icon: "invoices", label: "Invoices", badge: "2" },
      { id: "opportunities", icon: "opportunities", label: "Opportunities" },
    ],
  },
  {
    group: "Reports",
    items: [
      { id: "report-builder", icon: "builder", label: "Report Builder" },
      { id: "templates", icon: "templates", label: "Templates" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { id: "ai-insights", icon: "ai", label: "AI Insights", badge: "Phase 2", badgeClass: "new-badge" },
    ],
  },
];

const ICONS = {
  dashboard: (
    <path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 14h7v7H3z" />
  ),
  kpi: (
    <path d="M6 3h12l3 3v15H6zM8 9h11M8 13h11M8 17h8M18 3v3h3" />
  ),
  contracts: (
    <path d="M6 3h12l3 3v15H6zM18 3v3h3M9 10h9M9 14h9M9 18h6" />
  ),
  assets: (
    <path d="M12 3l2.5 2.5 3.5-.5.8 3.4 3.2 1.6-1.6 3.1 1.6 3.1-3.2 1.6-.8 3.4-3.5-.5L12 23l-2.5-2.5-3.5.5-.8-3.4L2 16.1l1.6-3.1L2 9.9l3.2-1.6.8-3.4 3.5.5zM12 9a4 4 0 100 8 4 4 0 000-8z" />
  ),
  invoices: (
    <path d="M6 4h12v16H6zM9 8h6M9 12h7M9 16h4" />
  ),
  opportunities: (
    <path d="M12 3l2.8 5.7L21 9.6l-4.5 4.4 1.1 6.3L12 17.4l-5.6 2.9 1.1-6.3L3 9.6l6.2-.9z" />
  ),
  builder: (
    <path d="M12 3l2.1 2.1 3-.4.7 2.9 2.7 1.4-1.4 2.6 1.4 2.6-2.7 1.4-.7 2.9-3-.4L12 21l-2.1-2.1-3 .4-.7-2.9-2.7-1.4 1.4-2.6-1.4-2.6 2.7-1.4.7-2.9 3 .4zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
  ),
  templates: (
    <path d="M3 6h7v6H3zM3 14h7v7H3zM12 6h9v6h-9zM12 14h9v7h-9z" />
  ),
  ai: (
    <path d="M8 7a4 4 0 018 0v2h1a2 2 0 012 2v4a2 2 0 01-2 2h-1v1a4 4 0 01-8 0v-1H7a2 2 0 01-2-2v-4a2 2 0 012-2h1zM9 13h6M10 17h4M9 9h.01M15 9h.01" />
  ),
};

function SidebarIcon({ name }) {
  return (
    <svg className="sidebar-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name] || ICONS.dashboard}
    </svg>
  );
}

function Sidebar({ active, onNav }) {
  return (
    <aside className="sidebar">
      {NAV.map((group) => (
        <div key={group.group}>
          <div className="sidebar-group-label">{group.group}</div>
          {group.items.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${active === item.id ? "active" : ""}`}
              onClick={() => onNav(item.id)}
            >
              <span className="sidebar-icon"><SidebarIcon name={item.icon} /></span>
              <span>{item.label}</span>
              {item.badge && (
                <span className={`sidebar-badge ${item.badgeClass || ""}`}>{item.badge}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;
