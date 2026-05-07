import api from "./api";

export const getProjects = async (token) => {
  const response = await api.get("/projects/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const createProject = async (projectData, token) => {
  const response = await api.post("/projects/", projectData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateProject = async (projectId, projectData, token) => {
  const response = await api.put(`/projects/${projectId}`, projectData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const addMemberToProject = async (projectId, userId, token) => {
  const response = await api.post(
    `/projects/${projectId}/members`,
    { user_id: userId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const addMembersToProject = async (projectId, members, token) => {
  const response = await api.post(
    `/projects/${projectId}/members/bulk`,
    { members },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getProjectMembers = async (projectId, token) => {
  const response = await api.get(`/projects/${projectId}/members`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
