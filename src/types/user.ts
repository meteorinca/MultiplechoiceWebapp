export type UserRole = 'admin' | 'user';

export type UserAccount = {
  id: string;
  login: string;
  displayName: string;
  createdAt: number;
  lastLoginAt?: number;
  role: UserRole;
};

export type UserCredentials = {
  login: string;
  password: string;
};
