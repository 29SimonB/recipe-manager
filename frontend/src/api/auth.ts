import type { User } from "../types";
import { apiFetch } from "./client";

interface AuthResponse {
  token: string;
  user: User;
}

export function register(name: string, email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function fetchMe() {
  return apiFetch<{ user: User }>("/auth/me");
}
