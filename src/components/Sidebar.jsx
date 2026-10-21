export default function Sidebar({ user, page, setPage, onLogout }) {
  const links = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "maintenance", label: "Maintenance", icon: "⚒" },
    { id: "amenities", label: "Amenities & Bookings", icon: "◇" },
  ];

  if (user.role === "manager") {
    links.push({ id: "properties", label: "Properties", icon: "⌂" });
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">P.</span>
        PropertyHub
      </div>

      <p className="side-label">WORKSPACE</p>

      {links.map(link => (
        <button
          key={link.id}
          className={`nav-item ${page === link.id ? "active" : ""}`}
          onClick={() => setPage(link.id)}
        >
          <span>{link.icon}</span>
          {link.label}
        </button>
      ))}

      <div className="sidebar-bottom">
        <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
        <div className="user-summary">
          <strong>{user.name}</strong>
          <small>{user.role}</small>
        </div>
        <button className="icon-button" onClick={onLogout} title="Sign out">
          ↪
        </button>
      </div>
    </aside>
  );
}