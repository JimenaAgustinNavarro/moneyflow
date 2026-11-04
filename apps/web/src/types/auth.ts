export type AuthUser = {
  id: string;
  email: string;
  name: string;
  timezone?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResult = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};
