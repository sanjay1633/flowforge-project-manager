import api from "./api";

export const getDashboard = async (token) => {
  const response = await api.get("/dashboard/", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};
