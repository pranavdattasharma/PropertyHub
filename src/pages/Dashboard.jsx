
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

export default function Dashboard({ user, maintenance, amenities, bookings, setPage }) {
  const pending = maintenance.filter((item) => item.status === "Pending").length;
  const inProgress = maintenance.filter((item) => item.status === "In Progress").length;
  const completed = maintenance.filter((item) => item.status === "Completed").length;

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Welcome back, {user.name?.split(" ")[0]} 👋</h1>
          <p>Here's what's happening with your property today.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Pending Requests" value={pending} detail="Awaiting action" />
        <StatCard title="In Progress" value={inProgress} detail="Being worked on" />
        <StatCard title="Completed" value={completed} detail="Resolved requests" />
        <StatCard title="Amenity Bookings" value={bookings.length} detail="Your visible bookings" />
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Recent Maintenance</h2>
            <p>Track the latest maintenance requests.</p>
          </div>
          <button className="text-button" onClick={() => setPage("maintenance")}>
            View all →
          </button>
        </div>

        {maintenance.length === 0 ? (
          <p className="empty-state">No maintenance requests yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {maintenance.slice(0, 5).map((item) => (
                  <tr key={item._id}>
                    <td>{item.issueDescription}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Amenities</h2>
            <p>Available amenities for your property.</p>
          </div>
          <button className="text-button" onClick={() => setPage("amenities")}>
            Explore →
          </button>
        </div>

        {amenities.length === 0 ? (
          <p className="empty-state">No amenities have been added yet.</p>
        ) : (
          <div className="amenity-grid">
            {amenities.slice(0, 4).map((amenity) => (
              <article className="amenity-card" key={amenity._id}>
                <h3>{amenity.name}</h3>
                <p>{amenity.description || "No description provided."}</p>
                <StatusBadge status={amenity.availabilityStatus} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}