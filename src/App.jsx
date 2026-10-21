
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Maintenance from "./pages/Maintenance";
import Amenities from "./pages/Amenities";
import Properties from "./pages/Properties";
import Sidebar from "./components/Sidebar";
import { getCurrentUser, logout } from "./services/authService";
import useDashboard from "./hooks/useDashboard";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const {
    maintenance,
    amenities,
    bookings,
    properties,
    loading,
    error,
    refreshData,
  } = useDashboard(user);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setCheckingAuth(false);
      return;
    }

    getCurrentUser()
      .then((result) => setUser(result.user || result))
      .catch(() => {
        logout();
        setUser(null);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setPage("dashboard");
  }

  function handleLogout() {
    logout();
    setUser(null);
    setPage("dashboard");
  }

  if (checkingAuth) {
    return <div className="loading-screen">Loading PropertyHub...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        page={page}
        setPage={setPage}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="topbar">
          <span>PropertyHub / {page.charAt(0).toUpperCase() + page.slice(1)}</span>
          <span className="role-label">{user.role}</span>
        </header>

        {error && <p className="feedback-message">{error}</p>}
        {loading && <p className="loading-note">Refreshing property data...</p>}

        {page === "dashboard" && (
          <Dashboard
            user={user}
            maintenance={maintenance}
            amenities={amenities}
            bookings={bookings}
            setPage={setPage}
          />
        )}

        {page === "maintenance" && (
          <Maintenance
            user={user}
            maintenance={maintenance}
            refreshData={refreshData}
          />
        )}

        {page === "amenities" && (
          <Amenities
            user={user}
            amenities={amenities}
            bookings={bookings}
            properties={properties}
            refreshData={refreshData}
          />
        )}

        {page === "properties" && user.role === "manager" && (
          <Properties
            properties={properties}
            refreshData={refreshData}
          />
        )}
      </main>
    </div>
  );
}
