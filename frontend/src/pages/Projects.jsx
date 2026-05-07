import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../assets/components/AppLayout";
import ProjectCard from "../assets/components/ProjectCard";
import { useAuth } from "../context/AuthContext";
import { createProject, getProjects } from "../services/projectService";

const projectStatusLabels = {
  planning: "Planning",
  scheduled: "Scheduled",
  in_progress: "In progress",
  overdue: "Overdue",
  completed: "Completed",
};

const getErrorMessage = (err, fallback) => {
  return err.response?.data?.message || err.response?.data?.msg || fallback;
};

function Projects() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    deadline: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProjects = async () => {
    try {
      setProjects(await getProjects(token));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load projects."));
    }
  };

  useEffect(() => {
    loadProjects();
  }, [token]);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      return `${project.title} ${project.description || ""}`.toLowerCase().includes(query);
    });
  }, [projects, searchTerm]);

  const handleFieldChange = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await createProject(formData, token);
      setFormData({ title: "", description: "", start_date: "", deadline: "" });
      setMessage("Project created.");
      await loadProjects();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create project."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout title="Projects">
      {error && <p className="alert error">{error}</p>}
      {message && <p className="alert success">{message}</p>}

      {user?.role === "admin" && (
        <ProjectCard
          formData={formData}
          isSubmitting={isSubmitting}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          user={user}
        />
      )}

      <section className="section">
        <div className="section-header">
          <h2>{user?.role === "admin" ? "Managed projects" : "Assigned projects"}</h2>
          <span>{filteredProjects.length} shown</span>
        </div>
        <div className="toolbar">
          <label className="search-field">
            Search projects
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by title or description"
            />
          </label>
        </div>
        <div className="project-grid">
          {filteredProjects.map((project) => (
            <Link className="project-card" key={project.id} to={`/projects/${project.id}`}>
              <div className="task-card-header">
                <span className={`status-badge ${project.status}`}>
                  {projectStatusLabels[project.status] || project.status}
                </span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.description || "No description added yet."}</p>
              <div className="mini-progress">
                <span style={{ width: `${project.progress || 0}%` }} />
              </div>
              <div className="project-card-footer">
                <span>{project.progress || 0}% complete</span>
                <span>{project.deadline || "No deadline"}</span>
              </div>
              {project.assigned_members?.length > 0 && (
                <p className="project-assignees">
                  Assigned: {project.assigned_members.slice(0, 3).join(", ")}
                  {project.assigned_members.length > 3 ? " +" : ""}
                </p>
              )}
              <span>Open project</span>
            </Link>
          ))}
          {filteredProjects.length === 0 && <p className="empty-state">No projects found.</p>}
        </div>
      </section>
    </AppLayout>
  );
}

export default Projects;
