import { apiClient } from "./client";
import type { LoginRequest, LoginResponse, RegisterRequest, User } from "../auth/authTypes";

export const authApi = {
  registerUser: (data: RegisterRequest) => apiClient.post<User>("/auth/register", data),
  loginUser: (data: LoginRequest) => apiClient.post<LoginResponse>("/auth/login", data),
  getCurrentUser: () => apiClient.get<User>("/auth/me"),
};
