const NAV = [
  {
    group: "Main",
    items: [
      { id: "dashboard",     icon: "📊", label: "Dashboard" },
      { id: "kpi-catalog",   icon: "📋", label: "KPI Catalog" },
    ],
  },
  {
    group: "Data Modules",
    items: [
      { id: "contracts",  icon: "📄", label: "Contracts",   badge: "3" },
      { id: "assets",     icon: "🔧", label: "Assets",      badge: "12" },
      { id: "invoices",   icon: "💰", label: "Invoices",    badge: "2" },
      { id: "opportunities", icon: "🎯", label: "Opportunities" },
    ],
  },
  {
    group: "Reports",
    items: [
      { id: "report-builder", icon: "⚙️", label: "Report Builder" },
      { id: "templates",      icon: "🗂️", label: "Templates" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { id: "ai-insights", icon: "🤖", label: "AI Insights", badge: "Phase 2", badgeClass: "new-badge" },
    ],
  },
];

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
              <span className="sidebar-icon">{item.icon}</span>
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
