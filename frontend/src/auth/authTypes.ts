export type UserRole = "teacher" | "student";

export type User = {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
};
