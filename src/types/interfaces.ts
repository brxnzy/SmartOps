import type { ReactNode } from "react";
import type { Customer } from "../types/customer.types";
import type { CustomerType } from "../types/customer.types";
import type { CustomerInput} from "../types/customer.types";

export interface CustomerSubmitOptions {
  invitationEmail?: string;
}

export interface CustomerFiltersProps {
  search: string;
  type: CustomerType | "all";
  onSearchChange: (value: string) => void;
  onTypeChange: (value: CustomerType | "all") => void;
  onCreate: () => void;
  disabled?: boolean;
}


export interface CustomerDeleteModalProps {
  open: boolean;
  customer: Customer | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export interface CustomerFormProps {
  initialData?: Customer | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: CustomerInput, options: CustomerSubmitOptions) => Promise<void>;
}


export interface CustomerModalProps {
  open: boolean;
  customer: Customer | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: CustomerInput, options: CustomerSubmitOptions) => Promise<void>;
}

export interface CustomerTableProps {
  items: Customer[];
  page: number;
  totalPages: number; 
  total: number;
  disabled?: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onPageChange: (page: number) => void;
}

export interface PermissionRouteProps {
  permission: string;
  children: ReactNode;
}


export interface CreateInvitationInput {
  companyId: string;
  companyName: string;
  customerId: string;
  customerName: string;
  invitationEmail: string;
  invitedByUserId: string;
  appBaseUrl: string;
}

export interface EmailInvitationPayload {
  mode?: "invite_existing_customer" | "invite_new_customer" | "invite_new_user" | "rollback_auth_user";
  email: string;
  redirectTo: string;
  customerId?: string;
  companyId: string;
  invitedByUserId: string;
  customerName?: string;
  customerIdCard?: string | null;
  customerType?: "hogar" | "comercio" | "empresa";
  customerTaxId?: string;
  customerPhone?: string | null;
  userName?: string;
  userIdCard?: string | null;
  roleId?: string;
  companyName?: string;
  authUserId?: string;
}

export interface ErrorLike {
  code?: unknown;
  message?: unknown;
}


export interface ButtonProps extends React.ComponentProps<"button"> {
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export interface FileInputProps extends React.ComponentProps<"input"> {
  label?: string;
}

export interface InputProps extends React.ComponentProps<"input"> {
  icon?: React.ReactNode;
}


export interface EmailInvitationPayload {
  mode?: "invite_existing_customer" | "invite_new_customer" | "invite_new_user" | "rollback_auth_user";
  email: string;
  redirectTo: string;
  customerId?: string;
  companyId: string;
  invitedByUserId: string;
  customerName?: string;
  customerIdCard?: string | null;
  customerType?: "hogar" | "comercio" | "empresa";
  customerTaxId?: string;
  customerPhone?: string | null;
  userName?: string;
  userIdCard?: string | null;
  roleId?: string;
  authUserId?: string;
}

export interface CallerRoleRow {
  company_id: string;
  roles: { name: string } | Array<{ name: string }> | null;
}
