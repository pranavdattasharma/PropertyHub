
import { useState } from "react";
import { apiRequest } from "../services/api";

export default function Properties({ properties, refreshData }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createProperty(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await apiRequest("/api/properties", {
        method: "POST",
        body: JSON.stringify({ name, address }),
      });

      setName("");
      setAddress("");
      setMessage("Property created successfully.");
      await refreshData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function assignTenant(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await apiRequest(`/api/properties/${propertyId}/tenants`, {
        method: "PATCH",
        body: JSON.stringify({ email: tenantEmail }),
      });

      setTenantEmail("");
      setMessage("Tenant assigned successfully.");
      await refreshData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROPERTY MANAGEMENT</p>
          <h1>Properties</h1>
          <p>Create properties and manage tenant assignments.</p>
        </div>
      </div>

      {message && <p className="feedback-message">{message}</p>}

      <section className="panel">
        <h2>Create a property</h2>
        <form className="stack-form" onSubmit={createProperty}>
          <label>
            Property name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Green Valley Apartments"
              required
            />
          </label>

          <label>
            Property address
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Enter the full address"
              rows={2}
              required
            />
          </label>

          <button className="primary-button" disabled={busy}>
            {busy ? "Saving..." : "Create property"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Assign a tenant</h2>
        <form className="stack-form" onSubmit={assignTenant}>
          <label>
            Select property
            <select
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              required
            >
              <option value="">Choose a property</option>
              {properties.map((property) => (
                <option key={property._id} value={property._id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Registered tenant email
            <input
              type="email"
              value={tenantEmail}
              onChange={(event) => setTenantEmail(event.target.value)}
              placeholder="tenant@example.com"
              required
            />
          </label>

          <button className="primary-button" disabled={busy}>
            {busy ? "Saving..." : "Assign tenant"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Your properties</h2>

        {properties.length === 0 ? (
          <p className="empty-state">No properties created yet.</p>
        ) : (
          <div className="property-grid">
            {properties.map((property) => (
              <article className="property-card" key={property._id}>
                <div className="property-icon">⌂</div>
                <h3>{property.name}</h3>
                <p>{property.address}</p>
                <small>Property ID: {property._id}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
