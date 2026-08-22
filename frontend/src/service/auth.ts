import api from "./Api";
import axios from "axios";

/**
 * Extrai a mensagem de erro amigável enviada pelo backend
 * (`{ error: "..." }` ou `{ errors: [...] }` do Zod), em vez da
 * mensagem genérica do axios ("Request failed with status code 403").
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        const data = err.response?.data as
            | { error?: string; errors?: { message?: string }[] }
            | undefined;

        if (data?.error) return data.error;

        // Erros de validação Zod chegam como array de issues
        if (Array.isArray(data?.errors) && data.errors.length > 0) {
            return data.errors[0]?.message ?? fallback;
        }
    }

    return err instanceof Error && !axios.isAxiosError(err)
        ? err.message
        : fallback;
}

// LOGIN 
const auth = {
    // Login now requires captchaAnswer to be sent to the backend for validation.
    login: async (email: string, password: string, captchaAnswer: string) => {
        const response = await api.post("/auth/login", { email, password, captchaAnswer });
        return response.data;
    },

    // LOGOUT
    logout: async () => {
        const response = await api.post("/auth/logout");
        return response.data;
    },

    // REGISTER
    // Register now also sends confirmPassword for server‑side validation.
    register: async (
        name: string,
        email: string,
        password: string,
        confirmPassword: string,
        captchaAnswer: string
    ) => {
        const response = await api.post("/auth/register", {
            name,
            email,
            password,
            confirmPassword,
            captchaAnswer,
        });
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
        // O backend espera o campo `password` (ver authSchema.ts)
        const response = await api.post("/auth/reset-password", { token, password: newPassword });
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

    // GET MATH CAPTCHA IMAGE (data‑uri)
    getMathCaptcha: async () => {
        const response = await api.get("/math-captcha");
        // Expected response: { image: string }
        return response.data.image as string;
    },
};

export default auth;