
import { useState } from "react";
import { apiRequest } from "../services/api";
import StatusBadge from "../components/StatusBadge";

export default function Amenities({
  user,
  amenities = [],
  bookings = [],
  properties = [],
  refreshData,
}) {
  const isManager = user?.role === "manager";

  const [selectedAmenity, setSelectedAmenity] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("10:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");

  const [propertyId, setPropertyId] = useState("");
  const [amenityName, setAmenityName] = useState("");
  const [description, setDescription] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [busy, setBusy] = useState(false);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  function getFriendlyBookingError(error) {
    const errorMessage = error?.message || "";

    if (
      errorMessage.toLowerCase().includes("already booked") ||
      errorMessage.toLowerCase().includes("conflict")
    ) {
      return "This time slot is already booked. Please choose another time slot.";
    }

    if (errorMessage.toLowerCase().includes("unavailable")) {
      return "This amenity is currently unavailable. Please choose another amenity.";
    }

    return errorMessage || "Booking failed. Please try again.";
  }

  async function createAmenity(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      await apiRequest("/api/amenities", {
        method: "POST",
        body: JSON.stringify({
          name: amenityName,
          description,
          propertyId,
        }),
      });

      setAmenityName("");
      setDescription("");
      showMessage("Amenity created successfully.");

      await refreshData();
    } catch (error) {
      showMessage(
        error.message || "Could not create amenity.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  async function createBooking(event) {
    event.preventDefault();
    setMessage("");

    if (checkInTime >= checkOutTime) {
      showMessage(
        "Check-out time must be later than check-in time.",
        "error"
      );
      return;
    }

    setBusy(true);

    try {
      await apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          amenityId: selectedAmenity,
          bookingDate,
          checkInTime,
          checkOutTime,
        }),
      });

      showMessage("Your amenity has been booked successfully!");
      setSelectedAmenity("");

      await refreshData();
    } catch (error) {
      showMessage(getFriendlyBookingError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function updateBookingStatus(bookingId, status) {
    setMessage("");
    setBusy(true);

    try {
      await apiRequest(`/api/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      showMessage("Booking status updated successfully.");
      await refreshData();
    } catch (error) {
      showMessage(
        error.message || "Could not update booking status.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PROPERTY MANAGEMENT</p>
          <h1>Amenities & Bookings</h1>
          <p>
            {isManager
              ? "Manage shared facilities across your properties."
              : "Explore amenities and reserve your preferred time slots."}
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`feedback-message ${
            messageType === "error"
              ? "feedback-error"
              : "feedback-success"
          }`}
          role="status"
          aria-live="polite"
          style={{
            padding: "14px 16px",
            marginBottom: "20px",
            borderRadius: "8px",
            border: `1px solid ${
              messageType === "error" ? "#f2b8b5" : "#a7d9b4"
            }`,
            background:
              messageType === "error" ? "#fff1f0" : "#eef8f0",
            color:
              messageType === "error" ? "#b42318" : "#176b36",
            fontWeight: 500,
          }}
        >
          {messageType === "error" ? "⚠️ " : "✓ "}
          {message}
        </div>
      )}

      {isManager && (
        <section className="panel">
          <h2>Add an amenity</h2>

          {properties.length === 0 ? (
            <p className="empty-state">
              Create a property first before adding amenities.
            </p>
          ) : (
            <form className="stack-form" onSubmit={createAmenity}>
              <label>
                Property
                <select
                  value={propertyId}
                  onChange={(event) => setPropertyId(event.target.value)}
                  required
                >
                  <option value="">Choose a property</option>
                  {properties.map((property) => (
                    <option key={property._id} value={property._id}>
                      {property.name} · {property.address}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Amenity name
                <input
                  value={amenityName}
                  onChange={(event) => setAmenityName(event.target.value)}
                  placeholder="e.g. Gym, Swimming Pool, Clubhouse"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the facility and its usage rules"
                  rows={3}
                />
              </label>

              <button className="primary-button" disabled={busy}>
                {busy ? "Saving..." : "Add amenity"}
              </button>
            </form>
          )}
        </section>
      )}

      <section className="panel">
        <h2>{isManager ? "Your amenities" : "Available amenities"}</h2>

        {amenities.length === 0 ? (
          <p className="empty-state">
            No amenities have been added yet.
          </p>
        ) : (
          <div className="amenity-grid">
            {amenities.map((amenity) => (
              <article className="amenity-card" key={amenity._id}>
                <h3>{amenity.name}</h3>
                <p>{amenity.description || "Shared property facility"}</p>
                <StatusBadge status={amenity.availabilityStatus} />
              </article>
            ))}
          </div>
        )}
      </section>

      {!isManager && (
        <section className="panel">
          <h2>Book an amenity</h2>

          {amenities.filter(
            (amenity) => amenity.availabilityStatus === "Available"
          ).length === 0 ? (
            <p className="empty-state">
              No amenities are available to book yet.
            </p>
          ) : (
            <form className="stack-form" onSubmit={createBooking}>
              <label>
                Select amenity
                <select
                  value={selectedAmenity}
                  onChange={(event) => setSelectedAmenity(event.target.value)}
                  required
                >
                  <option value="">Choose an amenity</option>
                  {amenities
                    .filter(
                      (amenity) =>
                        amenity.availabilityStatus === "Available"
                    )
                    .map((amenity) => (
                      <option key={amenity._id} value={amenity._id}>
                        {amenity.name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Booking date
                <input
                  type="date"
                  value={bookingDate}
                  min={new Date().toLocaleDateString("en-CA")}
                  onChange={(event) => setBookingDate(event.target.value)}
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  Check-in time
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(event) => setCheckInTime(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Check-out time
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(event) => setCheckOutTime(event.target.value)}
                    required
                  />
                </label>
              </div>

              <button className="primary-button" disabled={busy}>
                {busy ? "Booking..." : "Reserve time slot"}
              </button>
            </form>
          )}
        </section>
      )}

      <section className="panel">
        <h2>{isManager ? "Property bookings" : "Your bookings"}</h2>

        {bookings.length === 0 ? (
          <p className="empty-state">No bookings to display.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Amenity</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  {isManager && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.amenityId?.name || "Amenity"}</td>
                    <td>
                      {booking.bookingDate
                        ? new Date(booking.bookingDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      {booking.checkInTime}–{booking.checkOutTime}
                    </td>
                    <td>
                      <StatusBadge status={booking.status} />
                    </td>

                    {isManager && (
                      <td>
                        {booking.status === "Booked" && (
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() =>
                              updateBookingStatus(
                                booking._id,
                                "Checked In"
                              )
                            }
                          >
                            Check in
                          </button>
                        )}

                        {booking.status === "Checked In" && (
                          <button
                            className="text-button"
                            disabled={busy}
                            onClick={() =>
                              updateBookingStatus(
                                booking._id,
                                "Completed"
                              )
                            }
                          >
                            Complete
                          </button>
                        )}
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
