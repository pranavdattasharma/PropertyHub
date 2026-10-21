export default function StatusBadge({ status }) {
  const styles = {
    Completed: "completed",
    "In Progress": "progress",
    Pending: "pending",
    Available: "completed",
    Unavailable: "pending",
  };

  return (
    <span className={`status ${styles[status] || ""}`}>
      {status}
    </span>
  );
}