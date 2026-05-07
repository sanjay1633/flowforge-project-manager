function ProgressSummary({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const totalPoints = tasks.reduce((sum, task) => sum + (task.story_points || 0), 0);
  const completedPoints = tasks
    .filter((task) => task.status === "done")
    .reduce((sum, task) => sum + (task.story_points || 0), 0);
  const overdue = tasks.filter((task) => {
    if (!task.due_date || task.status === "done") {
      return false;
    }

    return new Date(`${task.due_date}T00:00:00`) < new Date(new Date().toDateString());
  }).length;
  const completion = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="section progress-section">
      <div>
        <p className="eyebrow">Project health</p>
        <h2>{completion}% complete</h2>
        <p className="muted">
          {done} done, {inProgress} active, {overdue} overdue
        </p>
      </div>
      <div className="progress-block">
        <div className="progress-track" aria-label={`${completion}% complete`}>
          <span style={{ width: `${completion}%` }} />
        </div>
        <div className="progress-metrics">
          <span>{total} tasks</span>
          <span>{completedPoints}/{totalPoints} pts</span>
          <span>{total - done} remaining</span>
        </div>
      </div>
    </section>
  );
}

export default ProgressSummary;
