function TopNav({ session, onLogout }) {
  const initial = session?.role?.charAt(0) ?? "U";
  return (
    <nav className="top-nav">
      <div className="nav-logo">
        <div className="hw-logo-badge">H</div>
        <div className="nav-divider" />
        <span className="nav-app-name">World Class Customer Reports</span>
      </div>

      {session && (
        <div className="nav-right">
          <span className="nav-role-chip">{session.role}</span>
          <div className="nav-avatar">{initial}</div>
          <button className="nav-signout" onClick={onLogout}>Sign Out</button>
        </div>
      )}
    </nav>
  );
}

export default TopNav;
