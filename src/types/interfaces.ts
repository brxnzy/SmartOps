import type { Customer } from "../types/customer.types";
import type { CustomerType } from "../types/customer.types";
import type { CustomerInput} from "../types/customer.types";

export interface CustomerSubmitOptions {
  sendInvitation: boolean;
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
