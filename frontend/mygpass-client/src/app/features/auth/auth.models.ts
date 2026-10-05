export type AuthUser = {
  userId: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  role: 'User' | 'Admin';
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
};

export type RegistrationRequest = {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  mobileNumber: string;
  password: string;
};
