import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

export interface User{
    id: string,
    name: string,
    email: string
}

export interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}


export interface ForgotPasswordForm {
  email: string;
}

export interface UpdatePasswordForm {
  password: string;
  confirmPassword: string;
}

export interface VerifyState {
  email?: string;
  shouldResend?: boolean;
}