const statLabels = {
  total_tasks: "Total tasks",
  completed_tasks: "Done",
  in_progress_tasks: "In progress",
  todo_tasks: "To do",
  overdue_tasks: "Overdue",
  total_bugs: "Bugs",
  open_bugs: "Open bugs",
  critical_bugs: "Critical bugs",
  my_tasks: "My tasks",
};

function DashboardStats({ stats }) {
  const totalTasks = stats?.total_tasks ?? 0;
  const completedTasks = stats?.completed_tasks ?? 0;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <>
      <section className="dashboard-overview">
        <div>
          <p className="eyebrow">Delivery overview</p>
          <h2>{completionRate}% complete</h2>
          <p className="muted">
            {completedTasks} of {totalTasks} tasks are complete across your accessible projects.
          </p>
        </div>
        <div className="progress-track" aria-label={`${completionRate}% complete`}>
          <span style={{ width: `${completionRate}%` }} />
        </div>
      </section>
      <section className="stat-grid">
        {Object.entries(statLabels).map(([key, label]) => (
          <div
            className={`stat-card ${
              (key === "overdue_tasks" || key === "critical_bugs") && stats?.[key] ? "danger" : ""
            }`}
            key={key}
          >
            <span>{label}</span>
            <strong>{stats?.[key] ?? 0}</strong>
          </div>
        ))}
      </section>
    </>
  );
}

export default DashboardStats;
