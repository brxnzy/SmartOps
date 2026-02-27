import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { UserProfile } from "./User";
import type { CompanyProfile } from "./Company";
import type { RoleProfile } from "./Role";

export interface AuthContextType {
  authUser: SupabaseUser | null;
  session: Session | null;
  userProfile: UserProfile | null;
  companyProfile: CompanyProfile | null;
  roleProfile: RoleProfile | null;
  permissions: string[];
  loading: boolean;
  initializing: boolean;
  authzLoading: boolean;
  canAccess: (permissionCode: string) => boolean;
  refreshProfile: () => Promise<void>;
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
