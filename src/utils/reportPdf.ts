import { jsPDF } from "jspdf";

const APP_COLOR = "#2563EB";
const PLACEHOLDER_TEXT = "—";

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  name: "Nombre",
  email: "Email",
  phone: "Teléfono",
  roleId: "ID de rol",
  roleName: "Rol",
  isDisabled: "Estado",
  createdAt: "Creado",
  tax_id: "RUC",
  idCard: "ID Card",
  address: "Dirección",
  deviceId: "ID",
  deviceName: "Dispositivo",
  deviceModel: "Modelo",
  quantity: "Cantidad",
  status: "Estado",
  price: "Precio",
  installationPrice: "Instalación",
  compatibility: "Compatibilidad",
  protocolId: "Protocolo",
  deviceTypeId: "Tipo",
  brandId: "Marca",
  discountPercent: "Descuento",
  description: "Descripción",
  category_id: "Categoría",
  sla_type: "SLA",
  user_id: "Cliente",
  scheduled_start: "Inicio",
  type: "Tipo",
};

function formatValue(value: any, field: string) {
  if (value === null || value === undefined || value === "") return PLACEHOLDER_TEXT;
  if (field === "isDisabled") return value ? "Deshabilitado" : "Activo";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (field === "createdAt" || field === "scheduled_start") {
    return new Date(value).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return String(value);
}

function getFieldLabel(field: string) {
  return FIELD_LABELS[field] || field.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function downloadPDF(
  data: any[],
  filename: string,
  fields: string[] = [],
  companyName: string = "SmartOps",
  titleOverride?: string,
  options: { headerColor?: string } = {}
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const headerHeight = 54;
  const rowHeight = 22;
  const headerColor = options.headerColor || APP_COLOR;

  const title = titleOverride || filename.replace(/_report\.pdf$/i, "").replace(/_/g, " ");

  doc.setFillColor(headerColor);
  doc.rect(margin, margin, maxWidth, headerHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#ffffff");
  doc.text(title.charAt(0).toUpperCase() + title.slice(1), margin + 12, margin + 34, { maxWidth: maxWidth - 24 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Compañía: ${companyName}`, margin + 12, margin + 50, { maxWidth: maxWidth - 24 });

  let y = margin + headerHeight + 24;

  if (fields.length === 0) {
    fields = Object.keys(data[0] || {}).slice(0, 4);
  }

  const columns = ["#", ...fields];
  const colWidth = maxWidth / columns.length;

  const renderPageHeader = () => {
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, maxWidth, rowHeight, "F");
    doc.setDrawColor(180);
    doc.setLineWidth(0.8);
    doc.rect(margin, y, maxWidth, rowHeight, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    columns.forEach((column, index) => {
      const x = margin + index * colWidth + 6;
      const label = index === 0 ? column : getFieldLabel(column as string);
      doc.text(label, x, y + 15, { maxWidth: colWidth - 12 });
    });
    y += rowHeight;
  };

  const addRow = (rowData: any, index: number) => {
    if (y + rowHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
      renderPageHeader();
    }

    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, maxWidth, rowHeight, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor("#000000");
    doc.text(String(index + 1), margin + 6, y + 15, { maxWidth: colWidth - 12 });

    fields.forEach((field, fieldIndex) => {
      const x = margin + (fieldIndex + 1) * colWidth + 6;
      const text = formatValue(rowData[field], field);
      doc.text(text, x, y + 15, { maxWidth: colWidth - 12 });
    });
    y += rowHeight;
  };

  renderPageHeader();

  data.forEach((row, index) => addRow(row, index));

  doc.save(filename);
}
