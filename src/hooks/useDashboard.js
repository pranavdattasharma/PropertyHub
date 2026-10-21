
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";

export default function useDashboard(user) {
  const [maintenance, setMaintenance] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshData = useCallback(async () => {
    if (!user) {
      setMaintenance([]);
      setAmenities([]);
      setBookings([]);
      setProperties([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    const endpoints = [
      { path: "/api/maintenance", key: "requests", setter: setMaintenance },
      { path: "/api/amenities", key: "amenities", setter: setAmenities },
      { path: "/api/bookings", key: "bookings", setter: setBookings },
      { path: "/api/properties", key: "properties", setter: setProperties },
    ];

    try {
      const results = await Promise.allSettled(
        endpoints.map(({ path }) => apiRequest(path))
      );

      const errors = [];

      results.forEach((result, index) => {
        const { path, key, setter } = endpoints[index];

        if (result.status === "rejected") {
          errors.push(`${path}: ${result.reason?.message || "Request failed"}`);
          return;
        }

        const data = result.value;

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.[key])
            ? data[key]
            : null;

        if (items === null) {
          errors.push(`${path}: Unexpected response format`);
          return;
        }

        setter(items);
      });

      if (errors.length > 0) {
        setError(errors.join(" | "));
      }
    } catch (err) {
      setError(err.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    maintenance,
    amenities,
    bookings,
    properties,
    loading,
    error,
    refreshData,
  };
}
