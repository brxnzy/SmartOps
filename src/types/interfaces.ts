import type { ChangeEvent, ReactNode, RefObject } from "react";
import type { Customer } from "../types/customer.types";
import type { CustomerType } from "../types/customer.types";
import type { CustomerInput} from "../types/customer.types";
import type { Customer360BasicProfile, Customer360Kpis, CustomerBillingRecord, CustomerContractPlan, CustomerSite, CustomerSiteZone } from "./customerProfile360.types";

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
  onViewDetail: (customer: Customer) => void;
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


export interface KpiGridProps {
  kpis: Customer360Kpis;
}

export interface EmptyStateProps {
  text: string;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  subtitle?: string;
  overlayClassName?: string;
  backdropClassName?: string;
  containerClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  closeClassName?: string;
  showCloseButton?: boolean;
  hideHeader?: boolean;
  header?: ReactNode;
}


export interface EditCustomerModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  customerId: string | undefined;
  profile: Customer360BasicProfile;
  onSaved: () => Promise<void>;
}


export interface QuoteModalProps {
  profile: Customer360BasicProfile;
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  customerId: string | undefined;
  onSaved: () => Promise<void>;
}


export interface TicketModalProps {
  profile: Customer360BasicProfile;
  open: boolean;
  onClose: () => void;
  companyId: string | null;
  customerId: string | undefined;
  onSaved: () => Promise<void>;
}

export interface BillingSectionProps {
  billing: CustomerBillingRecord[];
}

export interface ContractsSectionProps {
  contracts: CustomerContractPlan[];
}


export interface SiteDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  siteName: string;
}

export interface SiteAttachmentPreview {
  file: File;
  previewUrl: string | null;
  isImage: boolean;
}

export interface SiteModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  submitting: boolean;
  values: SiteFormValues;
  onChange: (values: SiteFormValues) => void;
  isEdit: boolean;
  attachments: SiteAttachmentPreview[];
  onRemoveAttachment: (index: number) => void;
  onAttachmentsChange: (event: ChangeEvent<HTMLInputElement>) => void;
  attachmentInputRef: RefObject<HTMLInputElement | null>;
}

export interface SiteZoneModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  submitting: boolean;
  value: string;
  onChange: (value: string) => void;
  siteName?: string;
}

export interface SiteZonesModalProps {
  open: boolean;
  onClose: () => void;
  site: CustomerSite | null;
  zones: CustomerSiteZone[];
  loading: boolean;
  error: string | null;
  onUpdateZone: (zoneId: string, name: string) => Promise<void>;
  onDeleteZone: (zoneId: string) => Promise<void>;
  onAddZone?: () => void;
}


export interface SiteZonesPanelProps {
  zones: CustomerSiteZone[];
  loading: boolean;
  error: string | null;
  onUpdate: (zoneId: string, name: string) => Promise<void>;
  onDelete: (zoneId: string) => Promise<void>;
  onAddZone?: () => void;
}

export interface SiteFormValues {
  name: string;
  address: string;
}


export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  company_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
}