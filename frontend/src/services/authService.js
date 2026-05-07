import api from "./api";

export const signupUser = async (userData) => {
  const response = await api.post("/auth/signup", userData);
  return response.data;
};

export const loginUser = async (userData) => {
  const response = await api.post("/auth/login", userData);
  return response.data;
};

export const getUsers = async (token, projectId) => {
  const response = await api.get("/auth/users", {
    params: projectId ? { project_id: projectId } : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
