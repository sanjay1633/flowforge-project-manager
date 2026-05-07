import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../assets/components/AppLayout";
import DashboardStats from "../assets/components/DashboardStats";
import { useAuth } from "../context/AuthContext";
import { getDashboard } from "../services/dashboardService";
import { getProjects } from "../services/projectService";

function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [dashboardData, projectData] = await Promise.all([
          getDashboard(token),
          getProjects(token),
        ]);
        setStats(dashboardData);
        setProjects(projectData);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load dashboard.");
      }
    };

    loadDashboard();
  }, [token]);

  return (
    <AppLayout title="Admin Dashboard" actions={<Link className="button" to="/projects">New project</Link>}>
      {error && <p className="alert error">{error}</p>}
      <DashboardStats stats={stats} />
      <section className="section">
        <div className="section-header">
          <h2>Recent projects</h2>
          <Link to="/projects">View all</Link>
        </div>
        <div className="project-grid">
          {projects.slice(0, 4).map((project) => (
            <Link className="project-card" key={project.id} to={`/projects/${project.id}`}>
              <h3>{project.title}</h3>
              <p>{project.description || "No description added yet."}</p>
            </Link>
          ))}
          {projects.length === 0 && <p className="empty-state">Create a project to begin assigning work.</p>}
        </div>
      </section>
    </AppLayout>
  );
}

export default AdminDashboard;
