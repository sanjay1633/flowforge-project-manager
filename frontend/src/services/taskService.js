import api from "./api";

export const getTasksByProject = async (projectId, token) => {
  const response = await api.get(`/tasks/project/${projectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const createTask = async (projectId, taskData, token) => {
  const response = await api.post(`/tasks/project/${projectId}`, taskData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateTask = async (taskId, taskData, token) => {
  const response = await api.put(`/tasks/${taskId}`, taskData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateTaskStatus = async (taskId, status, token) => {
  const response = await api.put(
    `/tasks/${taskId}/status`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const addTaskComment = async (taskId, body, token) => {
  const response = await api.post(
    `/tasks/${taskId}/comments`,
    { body },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const assignTask = async (taskId, assignedTo, token) => {
  const response = await api.put(
    `/tasks/${taskId}/assign`,
    { assigned_to: assignedTo },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
