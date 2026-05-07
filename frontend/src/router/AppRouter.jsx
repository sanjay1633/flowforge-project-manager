import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import AdminDashboard from "../pages/AdminDashboard";
import MemberDashboard from "../pages/MemberDashboard";
import Projects from "../pages/Projects";
import ProjectDetails from "../pages/ProjectDetails";
import { useAuth } from "../context/AuthContext";

function AppRouter() {
  const { token, user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              user?.role === "admin" ? (
                <Navigate to="/admin-dashboard" replace />
              ) : (
                <Navigate to="/member-dashboard" replace />
              )
            ) : (
              <Login />
            )
          }
        />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/admin-dashboard"
          element={token ? <AdminDashboard /> : <Navigate to="/" replace />}
        />
        <Route
          path="/member-dashboard"
          element={token ? <MemberDashboard /> : <Navigate to="/" replace />}
        />
        <Route
          path="/projects"
          element={token ? <Projects /> : <Navigate to="/" replace />}
        />
        <Route
          path="/projects/:projectId"
          element={token ? <ProjectDetails /> : <Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;