
import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function Maintenance({ user, maintenance, refreshData }) {
  const [description, setDescription] = useState("");
  const [assignedProperty, setAssignedProperty] = useState(null);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user.role !== "tenant") return;

    let active = true;

    async function loadAssignedProperty() {
      setPropertyLoading(true);

      try {
        const result = await apiRequest("/api/properties");
        const properties = Array.isArray(result)
          ? result
          : result.properties || [];

        if (active) {
          setAssignedProperty(properties[0] || null);
        }
      } catch (error) {
        if (active) setMessage(error.message);
      } finally {
        if (active) setPropertyLoading(false);
      }
    }

    loadAssignedProperty();

    return () => {
      active = false;
    };
  }, [user]);

  async function submitRequest(event) {
    event.preventDefault();
    setMessage("");

    if (!assignedProperty?._id) {
      setMessage("You are not assigned to a property. Please contact your manager.");
      return;
    }

    setBusy(true);

    try {
      await apiRequest("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          issueDescription: description,
          propertyId: assignedProperty._id,
        }),
      });

      setDescription("");
      setMessage("Maintenance request submitted successfully.");
      await refreshData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id, status) {
    setMessage("");

    try {
      await apiRequest(`/api/maintenance/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setStatusUpdates((previous) => ({
        ...previous,
        [id]: status,
      }));

      setMessage("Request status updated.");
      await refreshData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROPERTY CARE</p>
          <h1>Maintenance</h1>
          <p>Create requests and track their progress.</p>
        </div>
      </div>

      {message && <p className="feedback-message">{message}</p>}

      {user.role === "tenant" && (
        <section className="panel">
          <h2>Report an issue</h2>

          {propertyLoading ? (
            <p className="empty-state">Loading your assigned property...</p>
          ) : !assignedProperty ? (
            <p className="empty-state">
              You are not assigned to a property. Please ask your manager to
              assign your tenant account.
            </p>
          ) : (
            <>
              <div className="property-card">
                <h3>{assignedProperty.name}</h3>
                <p>{assignedProperty.address}</p>
              </div>

              <form className="stack-form" onSubmit={submitRequest}>
                <label>
                  Describe the issue
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="e.g. Kitchen tap is leaking"
                    rows={4}
                    maxLength={2000}
                    required
                  />
                </label>

                <button className="primary-button" disabled={busy}>
                  {busy ? "Submitting..." : "Submit request"}
                </button>
              </form>
            </>
          )}
        </section>
      )}

      <section className="panel">
        <h2>Maintenance requests</h2>

        {maintenance.length === 0 ? (
          <p className="empty-state">No requests to display.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Created</th>
                  {user.role === "manager" && <th>Update status</th>}
                </tr>
              </thead>
              <tbody>
                {maintenance.map((item) => (
                  <tr key={item._id}>
                    <td>{item.issueDescription}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>

                    {user.role === "manager" && (
                      <td>
                        <select
                          value={statusUpdates[item._id] || item.status}
                          onChange={(event) =>
                            updateStatus(item._id, event.target.value)
                          }
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
