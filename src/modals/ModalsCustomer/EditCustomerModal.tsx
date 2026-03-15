import Button from "../../components/Button";
import Field from "../../components/Field";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import type { EditCustomerModalProps } from "../../types/interfaces";
import type {  CustomerType } from "../../types/customer.types";
import { useModalCustomer } from "../../hooks/useModalCustomer";

export default function EditCustomerModal({
   open,
  onClose,
  companyId,
  customerId,
  profile,
  onSaved,
}: EditCustomerModalProps) {

  const {values, submitting, setValues, handleSave,} = useModalCustomer(
    { 
  open,
  onClose,
  companyId,
  customerId,
  profile,
  onSaved,
  })
  

  return (
    <Modal open={open} onClose={onClose} title="Editar cliente">
      <div className="space-y-3">
        <Field label="Nombre">
          <Input
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nombre del cliente"
            disabled={submitting}
          />
        </Field>
        <Field label="Cedula">
          <Input
            value={values.idCard ?? ""}
            onChange={(event) => setValues((prev) => ({ ...prev, idCard: event.target.value || null }))}
            placeholder="402-1234567-8"
            disabled={submitting}
          />
        </Field>
        <Field label="Telefono">
          <Input
            value={values.phone ?? ""}
            onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value || null }))}
            placeholder="809-555-0101"
            disabled={submitting}
          />
        </Field>
        <Field label="Tipo de cliente">
          <select
            value={values.type}
            onChange={(event) => setValues((prev) => ({ ...prev, type: event.target.value as CustomerType }))}
            disabled={submitting}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="hogar">Hogar</option>
            <option value="comercio">Comercio</option>
            <option value="empresa">Empresa</option>
          </select>
        </Field>
        <Field label="Tax ID">
          <Input
            value={values.taxId}
            onChange={(event) => setValues((prev) => ({ ...prev, taxId: event.target.value }))}
            placeholder="Tax ID"
            disabled={submitting}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting}
            className="border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
}
