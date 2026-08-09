import api from "./Api";

// LOGIN 
const auth = {
    login: async (email: string, password: string) => {
        const response = await api.post("/auth/login", { email, password });
        return response.data;
    },

    // LOGOUT
    logout: async () => {
        const response = await api.post("/auth/logout");
        return response.data;
    },

    // REGISTER
    register: async (name: string, email: string, password: string) => {
        const response = await api.post("/auth/register", { name, email, password });
        return response.data;
    },

    // REFRESH TOKEN
    refreshToken: async () => {
        const response = await api.post("/auth/refresh-token");
        return response.data;
    },

    // FORGOT PASSWORD
    forgotPassword: async (email: string) => {
        const response = await api.post("/auth/forgot-password", { email });
        return response.data;
    },

    // RESET PASSWORD
    resetPassword: async (token: string, newPassword: string) => {
        const response = await api.post("/auth/reset-password", { token, newPassword });
        return response.data;
    },

    // UPDATE USER
    updateUser: async (id: string, data: { name?: string; email?: string; password?: string }) => {
        const response = await api.put(`/auth/users/${id}`, data);
        return response.data;
    },

    // DELETE USER
    deleteUser: async (id: string) => {
        const response = await api.delete(`/auth/users/${id}`);
        return response.data;
    },
};

export default auth;