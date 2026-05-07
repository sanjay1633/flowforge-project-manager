import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AppLayout from "../assets/components/AppLayout";
import ProgressSummary from "../assets/components/ProgressSummary";
import { getUsers } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import {
  addMemberToProject,
  addMembersToProject,
  getProjectMembers,
  getProjects,
  updateProject,
} from "../services/projectService";
import {
  addTaskComment,
  assignTask,
  createTask,
  getTasksByProject,
  updateTask,
  updateTaskStatus,
} from "../services/taskService";

const statusLabels = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const issueTypeLabels = {
  task: "Task",
  bug: "Bug",
};

const severityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const projectStatusLabels = {
  planning: "Planning",
  scheduled: "Scheduled",
  in_progress: "In progress",
  overdue: "Overdue",
  completed: "Completed",
};

const emptyTaskForm = {
  title: "",
  description: "",
  issue_type: "task",
  assigned_to: "",
  due_date: "",
  priority: "medium",
  severity: "medium",
  label: "",
  reproduction_steps: "",
  environment: "",
  story_points: 1,
};

const emptyMemberRow = {
  name: "",
  email: "",
  role: "member",
  password: "",
};

const getErrorMessage = (err, fallback) => {
  return err.response?.data?.message || err.response?.data?.msg || fallback;
};

function ProjectDetails() {
  const { projectId } = useParams();
  const { token, user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    start_date: "",
    deadline: "",
  });
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRows, setMemberRows] = useState([emptyMemberRow]);
  const [filters, setFilters] = useState({
    search: "",
    assignee: "all",
    due: "all",
    priority: "all",
    issue_type: "all",
    severity: "all",
  });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editForm, setEditForm] = useState(emptyTaskForm);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [memberError, setMemberError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";

  const loadProject = async () => {
    const [projectData, taskData, memberData] = await Promise.all([
      getProjects(token),
      getTasksByProject(projectId, token),
      getProjectMembers(projectId, token),
    ]);

    const selectedProject = projectData.find((item) => String(item.id) === String(projectId)) || null;
    setProject(selectedProject);
    if (selectedProject) {
      setProjectForm({
        title: selectedProject.title || "",
        description: selectedProject.description || "",
        start_date: selectedProject.start_date || "",
        deadline: selectedProject.deadline || "",
      });
    }
    setTasks(taskData);
    setMembers(memberData);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadProject();
        if (isAdmin) {
          setUsers(await getUsers(token, projectId));
        }
      } catch (err) {
        setError(getErrorMessage(err, "Unable to load project."));
      }
    };

    load();
  }, [projectId, token, isAdmin]);

  const availableUsers = useMemo(() => {
    return users;
  }, [users]);

  const filteredTasks = useMemo(() => {
    const today = new Date(new Date().toDateString());
    const query = filters.search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch = !query || `${task.title} ${task.description || ""}`.toLowerCase().includes(query);
      const matchesAssignee = filters.assignee === "all"
        || (filters.assignee === "unassigned" && !task.assigned_to)
        || String(task.assigned_to) === filters.assignee;
      const matchesPriority = filters.priority === "all" || task.priority === filters.priority;
      const matchesIssueType = filters.issue_type === "all" || task.issue_type === filters.issue_type;
      const matchesSeverity = filters.severity === "all" || task.severity === filters.severity;
      const isOverdue = task.due_date
        && task.status !== "done"
        && new Date(`${task.due_date}T00:00:00`) < today;
      const matchesDue = filters.due === "all"
        || (filters.due === "overdue" && isOverdue)
        || (filters.due === "open" && task.status !== "done")
        || (filters.due === "done" && task.status === "done");

      return matchesSearch && matchesAssignee && matchesPriority && matchesIssueType && matchesSeverity && matchesDue;
    });
  }, [tasks, filters]);

  const groupedTasks = useMemo(() => {
    return Object.keys(statusLabels).reduce((groups, status) => {
      groups[status] = filteredTasks.filter((task) => task.status === status);
      return groups;
    }, {});
  }, [filteredTasks]);

  const isTaskOverdue = (task) => {
    if (!task.due_date || task.status === "done") {
      return false;
    }

    return new Date(`${task.due_date}T00:00:00`) < new Date(new Date().toDateString());
  };

  const workloadSummary = useMemo(() => {
    return members.map((member) => {
      const assignedTasks = tasks.filter((task) => task.assigned_to === member.id);
      const openTasks = assignedTasks.filter((task) => task.status !== "done");
      const points = assignedTasks.reduce((total, task) => total + (task.story_points || 0), 0);

      return {
        ...member,
        openTasks: openTasks.length,
        points,
      };
    });
  }, [members, tasks]);

  const bugSummary = useMemo(() => {
    const bugs = tasks.filter((task) => task.issue_type === "bug");
    const openBugs = bugs.filter((task) => task.status !== "done");
    const criticalBugs = openBugs.filter((task) => task.severity === "critical");

    return {
      total: bugs.length,
      open: openBugs.length,
      critical: criticalBugs.length,
    };
  }, [tasks]);

  const canMoveTask = (task) => {
    return isAdmin || task.assigned_to === user?.id;
  };

  const handleTaskChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((current) => ({ ...current, [name]: value }));
  };

  const handleProjectChange = (event) => {
    const { name, value } = event.target;
    setProjectForm((current) => ({ ...current, [name]: value }));
  };

  const handleProjectUpdate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await updateProject(projectId, projectForm, token);
      setMessage("Project schedule updated.");
      await loadProject();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update project schedule."));
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const payload = {
        ...taskForm,
        assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : null,
        story_points: Number(taskForm.story_points),
      };
      await createTask(projectId, payload, token);
      setTaskForm(emptyTaskForm);
      setMessage("Task created.");
      await loadProject();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create task."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setMemberError("");

    if (!memberUserId) {
      setMemberError("Select an existing user first.");
      return;
    }

    try {
      await addMemberToProject(projectId, Number(memberUserId), token);
      setMemberUserId("");
      setMessage("Member added.");
      await loadProject();
      if (isAdmin) {
        setUsers(await getUsers(token, projectId));
      }
    } catch (err) {
      setMemberError(getErrorMessage(err, "Unable to add member."));
    }
  };

  const handleMemberRowChange = (index, field, value) => {
    setMemberError("");
    setMemberRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) {
        return row;
      }

      return { ...row, [field]: value };
    }));
  };

  const addMemberRow = () => {
    setMemberError("");
    setMemberRows((current) => [...current, { ...emptyMemberRow }]);
  };

  const removeMemberRow = (index) => {
    setMemberError("");
    setMemberRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const handleAddMembersByDetails = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setMemberError("");

    const membersToAdd = memberRows
      .map((row) => ({
        name: row.name.trim(),
        email: row.email.trim().toLowerCase(),
        role: row.role,
        password: row.password,
      }))
      .filter((row) => row.name || row.email || row.password);

    if (!membersToAdd.length) {
      setMemberError("Enter at least one member name or email.");
      return;
    }

    try {
      const data = await addMembersToProject(projectId, membersToAdd, token);
      const skippedCount = data.skipped?.length || 0;
      setMemberRows([{ ...emptyMemberRow }]);
      setMessage(`${data.message}${skippedCount ? `, ${skippedCount} already existed` : ""}.`);
      await loadProject();
      if (isAdmin) {
        setUsers(await getUsers(token, projectId));
      }
    } catch (err) {
      const rowErrors = err.response?.data?.errors;
      const firstRowError = Array.isArray(rowErrors) && rowErrors.length
        ? ` Row ${rowErrors[0].row}: ${rowErrors[0].message}`
        : "";
      setMemberError(`${err.response?.data?.message || "Unable to add members."}${firstRowError}`);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await updateTaskStatus(taskId, status, token);
      await loadProject();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update task."));
    }
  };

  const handleAssign = async (taskId, assignedTo) => {
    try {
      await assignTask(taskId, assignedTo ? Number(assignedTo) : "", token);
      await loadProject();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to assign task."));
    }
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      issue_type: task.issue_type || "task",
      assigned_to: task.assigned_to || "",
      due_date: task.due_date || "",
      priority: task.priority || "medium",
      severity: task.severity || "medium",
      label: task.label || "",
      reproduction_steps: task.reproduction_steps || "",
      environment: task.environment || "",
      story_points: task.story_points || 0,
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveTask = async (event, taskId) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await updateTask(taskId, {
        ...editForm,
        story_points: Number(editForm.story_points),
      }, token);
      setEditingTaskId(null);
      setMessage("Task updated.");
      await loadProject();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update task."));
    }
  };

  const handleCommentSubmit = async (event, taskId) => {
    event.preventDefault();
    const body = (commentDrafts[taskId] || "").trim();

    if (!body) {
      return;
    }

    try {
      await addTaskComment(taskId, body, token);
      setCommentDrafts((current) => ({ ...current, [taskId]: "" }));
      await loadProject();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to add comment."));
    }
  };

  const handleColumnDrop = async (status) => {
    if (!draggingTaskId) {
      return;
    }

    const task = tasks.find((item) => item.id === draggingTaskId);
    setDraggingTaskId(null);

    if (!task || task.status === status) {
      return;
    }

    await handleStatusChange(task.id, status);
  };

  return (
    <AppLayout title={project?.title || "Project"}>
      {error && <p className="alert error">{error}</p>}
      {message && <p className="alert success">{message}</p>}

      <section className="section">
        <div className="task-card-header">
          <span className={`status-badge ${project?.status || "planning"}`}>
            {projectStatusLabels[project?.status] || "Planning"}
          </span>
          <span className="label-badge">{project?.progress || 0}% complete</span>
        </div>
        <p className="muted">{project?.description || "No description added yet."}</p>
        <div className="project-schedule-meta">
          <span>Start: {project?.start_date || "Not set"}</span>
          <span>Deadline: {project?.deadline || "Not set"}</span>
          <span>Assigned: {project?.assigned_members?.join(", ") || "No task assignees yet"}</span>
        </div>
        <div className="member-row">
          {members.map((member) => (
            <span className="user-chip" key={member.id}>{member.name}</span>
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="section">
          <div className="section-header">
            <h2>Project timeline</h2>
            <span>Status updates automatically from dates and tasks</span>
          </div>
          <form className="inline-form schedule-form" onSubmit={handleProjectUpdate}>
            <label>
              Project title
              <input name="title" value={projectForm.title} onChange={handleProjectChange} required />
            </label>
            <label>
              Description
              <textarea name="description" value={projectForm.description} onChange={handleProjectChange} rows="3" />
            </label>
            <div className="form-grid">
              <label>
                Starting date
                <input type="date" name="start_date" value={projectForm.start_date} onChange={handleProjectChange} />
              </label>
              <label>
                Deadline
                <input type="date" name="deadline" value={projectForm.deadline} onChange={handleProjectChange} />
              </label>
            </div>
            <button className="button" type="submit">Update project timeline</button>
          </form>
        </section>
      )}

      <ProgressSummary tasks={tasks} />

      <section className="section bug-summary">
        <div>
          <p className="eyebrow">Bug tracking</p>
          <h2>{bugSummary.open} open bugs</h2>
          <p className="muted">
            {bugSummary.total} reported, {bugSummary.critical} critical open
          </p>
        </div>
        <div className="bug-summary-grid">
          <span className="issue-badge bug">Bug reports</span>
          <span className="severity-badge critical">Critical: {bugSummary.critical}</span>
          <span className="status-badge done">Closed: {bugSummary.total - bugSummary.open}</span>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Team workload</h2>
          <span>{workloadSummary.length} members</span>
        </div>
        <div className="workload-grid">
          {workloadSummary.map((member) => (
            <div className="workload-card" key={member.id}>
              <strong>{member.name}</strong>
              <span>{member.openTasks} open tasks</span>
              <span>{member.points} story points</span>
            </div>
          ))}
          {workloadSummary.length === 0 && <p className="empty-state">No members yet.</p>}
        </div>
      </section>

      {isAdmin && (
        <section className="section management-grid">
          <div className="team-panel">
            {memberError && <p className="form-error">{memberError}</p>}
            <form className="inline-form" onSubmit={handleAddMember}>
              <h2>Add existing user</h2>
              <label>
                User
                <select
                  value={memberUserId}
                  onChange={(event) => setMemberUserId(event.target.value)}
                  disabled={availableUsers.length === 0}
                >
                  <option value="">
                    {availableUsers.length ? "Select a user" : "No existing users available"}
                  </option>
                  {availableUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.email})
                    </option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit" disabled={availableUsers.length === 0}>
                Add selected user
              </button>
            </form>

            <form className="inline-form member-bulk-form" onSubmit={handleAddMembersByDetails}>
              <div className="section-header compact">
                <h2>Add members by details</h2>
                <button className="button secondary" type="button" onClick={addMemberRow}>
                  Add row
                </button>
              </div>
              <div className="member-bulk-list">
                {memberRows.map((row, index) => (
                  <div className="member-row-form" key={index}>
                    <label>
                      Name
                      <input
                        value={row.name}
                        onChange={(event) => handleMemberRowChange(index, "name", event.target.value)}
                        placeholder="Member name"
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        value={row.email}
                        onChange={(event) => handleMemberRowChange(index, "email", event.target.value)}
                        placeholder="name@example.com"
                      />
                    </label>
                    <label>
                      Role
                      <select
                        value={row.role}
                        onChange={(event) => handleMemberRowChange(index, "role", event.target.value)}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <label>
                      Initial password
                      <input
                        type="password"
                        value={row.password}
                        onChange={(event) => handleMemberRowChange(index, "password", event.target.value)}
                        placeholder="For new users"
                      />
                    </label>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => removeMemberRow(index)}
                      disabled={memberRows.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button className="button" type="submit">Add member rows</button>
            </form>
          </div>

          <form className="inline-form" onSubmit={handleCreateTask}>
            <h2>Create task</h2>
            <label>
              Title
              <input name="title" value={taskForm.title} onChange={handleTaskChange} required />
            </label>
            <label>
              Description
              <textarea name="description" value={taskForm.description} onChange={handleTaskChange} rows="3" />
            </label>
            <div className="form-grid">
              <label>
                Issue type
                <select name="issue_type" value={taskForm.issue_type} onChange={handleTaskChange}>
                  {Object.entries(issueTypeLabels).map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </select>
              </label>
              <label>
                Severity
                <select name="severity" value={taskForm.severity} onChange={handleTaskChange}>
                  {Object.entries(severityLabels).map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                Priority
                <select name="priority" value={taskForm.priority} onChange={handleTaskChange}>
                  {Object.entries(priorityLabels).map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </select>
              </label>
              <label>
                Points
                <input
                  type="number"
                  min="0"
                  max="100"
                  name="story_points"
                  value={taskForm.story_points}
                  onChange={handleTaskChange}
                />
              </label>
            </div>
            <label>
              Label
              <input
                name="label"
                value={taskForm.label}
                onChange={handleTaskChange}
                placeholder="Frontend, Bug, Sprint 1"
              />
            </label>
            {taskForm.issue_type === "bug" && (
              <>
                <label>
                  Reproduction steps
                  <textarea
                    name="reproduction_steps"
                    value={taskForm.reproduction_steps}
                    onChange={handleTaskChange}
                    placeholder="1. Open... 2. Click... 3. Expected vs actual..."
                    rows="4"
                    required
                  />
                </label>
                <label>
                  Environment
                  <input
                    name="environment"
                    value={taskForm.environment}
                    onChange={handleTaskChange}
                    placeholder="Chrome, Windows, staging"
                  />
                </label>
              </>
            )}
            <label>
              Assignee
              <select name="assigned_to" value={taskForm.assigned_to} onChange={handleTaskChange}>
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input type="date" name="due_date" value={taskForm.due_date} onChange={handleTaskChange} />
            </label>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create task"}
            </button>
          </form>
        </section>
      )}

      <section className="section board-controls">
        <label className="search-field">
          Search tasks
          <input
            type="search"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search title or description"
          />
        </label>
        <label>
          Assignee
          <select
            value={filters.assignee}
            onChange={(event) => setFilters((current) => ({ ...current, assignee: event.target.value }))}
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select
            value={filters.issue_type}
            onChange={(event) => setFilters((current) => ({ ...current, issue_type: event.target.value }))}
          >
            <option value="all">All types</option>
            {Object.entries(issueTypeLabels).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select
            value={filters.priority}
            onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
          >
            <option value="all">All priorities</option>
            {Object.entries(priorityLabels).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select
            value={filters.severity}
            onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}
          >
            <option value="all">All severities</option>
            {Object.entries(severityLabels).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label>
          Focus
          <select
            value={filters.due}
            onChange={(event) => setFilters((current) => ({ ...current, due: event.target.value }))}
          >
            <option value="all">All tasks</option>
            <option value="open">Open work</option>
            <option value="overdue">Overdue</option>
            <option value="done">Completed</option>
          </select>
        </label>
      </section>

      <section className="task-board">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div
            className="task-column"
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleColumnDrop(status)}
          >
            <div className="column-header">
              <h2>{label}</h2>
              <span>{groupedTasks[status]?.length || 0}</span>
            </div>
            {groupedTasks[status]?.map((task) => (
              <article
                className={`task-card ${task.issue_type === "bug" ? "bug-card" : ""} ${isTaskOverdue(task) ? "overdue" : ""}`}
                draggable={canMoveTask(task)}
                key={task.id}
                onDragEnd={() => setDraggingTaskId(null)}
                onDragStart={() => setDraggingTaskId(task.id)}
              >
                {editingTaskId === task.id ? (
                  <form className="card-edit-form" onSubmit={(event) => handleSaveTask(event, task.id)}>
                    <label>
                      Title
                      <input name="title" value={editForm.title} onChange={handleEditChange} required />
                    </label>
                    <label>
                      Description
                      <textarea name="description" value={editForm.description} onChange={handleEditChange} rows="3" />
                    </label>
                    <div className="form-grid">
                      <label>
                        Issue type
                        <select name="issue_type" value={editForm.issue_type} onChange={handleEditChange}>
                          {Object.entries(issueTypeLabels).map(([value, text]) => (
                            <option key={value} value={value}>{text}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Severity
                        <select name="severity" value={editForm.severity} onChange={handleEditChange}>
                          {Object.entries(severityLabels).map(([value, text]) => (
                            <option key={value} value={value}>{text}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form-grid">
                      <label>
                        Priority
                        <select name="priority" value={editForm.priority} onChange={handleEditChange}>
                          {Object.entries(priorityLabels).map(([value, text]) => (
                            <option key={value} value={value}>{text}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Points
                        <input
                          type="number"
                          min="0"
                          max="100"
                          name="story_points"
                          value={editForm.story_points}
                          onChange={handleEditChange}
                        />
                      </label>
                    </div>
                    <label>
                      Label
                      <input name="label" value={editForm.label} onChange={handleEditChange} />
                    </label>
                    <label>
                      Due date
                      <input type="date" name="due_date" value={editForm.due_date} onChange={handleEditChange} />
                    </label>
                    {editForm.issue_type === "bug" && (
                      <>
                        <label>
                          Reproduction steps
                          <textarea
                            name="reproduction_steps"
                            value={editForm.reproduction_steps}
                            onChange={handleEditChange}
                            rows="4"
                            required
                          />
                        </label>
                        <label>
                          Environment
                          <input name="environment" value={editForm.environment} onChange={handleEditChange} />
                        </label>
                      </>
                    )}
                    <div className="card-actions">
                      <button className="button" type="submit">Save</button>
                      <button className="button secondary" type="button" onClick={() => setEditingTaskId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="task-card-header">
                      <span className={`issue-badge ${task.issue_type || "task"}`}>
                        {issueTypeLabels[task.issue_type] || "Task"}
                      </span>
                      <span className={`status-badge ${task.status}`}>{statusLabels[task.status]}</span>
                      <span className={`priority-badge ${task.priority}`}>{priorityLabels[task.priority] || "Medium"}</span>
                      {task.issue_type === "bug" && (
                        <span className={`severity-badge ${task.severity}`}>
                          {severityLabels[task.severity] || "Medium"}
                        </span>
                      )}
                      {task.label && <span className="label-badge">{task.label}</span>}
                      {isTaskOverdue(task) && <span className="status-badge overdue">Overdue</span>}
                    </div>
                    <h3>{task.title}</h3>
                    <p>{task.description || "No description."}</p>
                    <div className="task-meta">
                      <span>{task.assignee_name || "Unassigned"}</span>
                      <span>{task.due_date || "No due date"}</span>
                      <span>{task.story_points || 0} pts</span>
                    </div>
                    {task.issue_type === "bug" && (
                      <div className="bug-details">
                        <strong>Steps to reproduce</strong>
                        <p>{task.reproduction_steps || "No reproduction steps added."}</p>
                        {task.environment && <span>Environment: {task.environment}</span>}
                      </div>
                    )}
                    <select value={task.status} onChange={(event) => handleStatusChange(task.id, event.target.value)}>
                      {Object.entries(statusLabels).map(([value, text]) => (
                        <option key={value} value={value}>{text}</option>
                      ))}
                    </select>
                    {isAdmin && (
                      <select
                        value={task.assigned_to || ""}
                        onChange={(event) => handleAssign(task.id, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="card-actions">
                      {isAdmin && (
                        <button className="button secondary" type="button" onClick={() => startEditingTask(task)}>
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="comment-list">
                      {(task.comments || []).slice(-2).map((comment) => (
                        <div className="comment" key={comment.id}>
                          <strong>{comment.author_name}</strong>
                          <p>{comment.body}</p>
                        </div>
                      ))}
                    </div>
                    <form className="comment-form" onSubmit={(event) => handleCommentSubmit(event, task.id)}>
                      <input
                        value={commentDrafts[task.id] || ""}
                        onChange={(event) => setCommentDrafts((current) => ({
                          ...current,
                          [task.id]: event.target.value,
                        }))}
                        placeholder="Add a comment"
                      />
                      <button className="button secondary" type="submit">Post</button>
                    </form>
                  </>
                )}
              </article>
            ))}
            {groupedTasks[status]?.length === 0 && <p className="empty-state">No tasks.</p>}
          </div>
        ))}
      </section>
    </AppLayout>
  );
}

export default ProjectDetails;
