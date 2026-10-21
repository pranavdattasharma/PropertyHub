
const API_URL = "http://localhost:5000";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(
      "Unable to connect to the server. Please try again."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        (response.status === 409
          ? "This time slot is already booked. Please choose another time slot."
          : "Something went wrong. Please try again.")
    );
  }

  return data;
}
