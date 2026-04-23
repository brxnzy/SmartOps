import { jsPDF } from "jspdf";
import smartOpsLogo from "../assets/logo.png";

const PLACEHOLDER_TEXT = "-";

export type DownloadReportOptions = {
  companyLogoUrl?: string | null;
  subtitle?: string | null;
  generatedBy?: string | null;
  summary?: Array<{
    label: string;
    value: string;
  }>;
};

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  name: "Nombre",
  email: "Email",
  phone: "Telefono",
  roleId: "ID de rol",
  roleName: "Rol",
  isDisabled: "Estado",
  createdAt: "Creado",
  tax_id: "RUC",
  idCard: "ID Card",
  address: "Direccion",
  deviceId: "ID",
  deviceName: "Dispositivo",
  deviceModel: "Modelo",
  quantity: "Cantidad",
  status: "Estado",
  price: "Precio",
  installationPrice: "Instalacion",
  compatibility: "Compatibilidad",
  protocolId: "Protocolo",
  deviceTypeId: "Tipo",
  brandId: "Marca",
  discountPercent: "Descuento",
  description: "Descripcion",
  category_id: "Categoria",
  sla_type: "SLA",
  user_id: "Cliente",
  scheduled_start: "Inicio",
  type: "Tipo",
  amount: "Monto",
  amountTotal: "Total",
  amountPaid: "Pagado",
  amountPending: "Pendiente",
  customerName: "Cliente",
  companyName: "Compania",
  invoiceNumber: "Factura",
  receiptNumber: "Recibo",
  submittedAt: "Enviado",
  approvedAt: "Aprobado",
  paymentDate: "Fecha",
  method: "Metodo",
  reference: "Referencia",
  deviceSerial: "Serial",
  macAddress: "MAC",
  siteName: "Sitio",
  zoneName: "Zona",
};

function formatValue(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return PLACEHOLDER_TEXT;
  if (field === "isDisabled") return value ? "Deshabilitado" : "Activo";
  if (typeof value === "boolean") return value ? "Si" : "No";

  if (field === "method") {
    const method = String(value);
    if (method === "cash") return "Efectivo";
    if (method === "bank_transfer") return "Transferencia";
    if (method === "card") return "Tarjeta";
    return "Otros";
  }

  if (["createdAt", "scheduled_start", "submittedAt", "approvedAt", "paymentDate"].includes(field)) {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("es-DO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  if (
    typeof value === "number" &&
    ["price", "installationPrice", "amount", "amountTotal", "amountPaid", "amountPending", "discountPercent"].includes(field)
  ) {
    return value.toLocaleString("es-DO", {
      minimumFractionDigits: field === "discountPercent" ? 0 : 2,
      maximumFractionDigits: field === "discountPercent" ? 2 : 2,
    });
  }

  return String(value);
}

function getFieldLabel(field: string) {
  return FIELD_LABELS[field] || field.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettifyFilename(filename: string) {
  return filename.replace(/\.pdf$/i, "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeFilename(filename: string) {
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
}

function clipText(doc: jsPDF, input: string, maxWidth: number): string {
  if (doc.getTextWidth(input) <= maxWidth) return input;
  let text = input;
  while (text.length > 1 && doc.getTextWidth(`${text}...`) > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}...`;
}

function cellPadding() {
  return 6;
}

async function imageToDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function getReportLogo(companyLogoUrl?: string | null) {
  if (companyLogoUrl?.trim()) {
    const companyLogo = await imageToDataUrl(companyLogoUrl.trim());
    if (companyLogo) return companyLogo;
  }
  return imageToDataUrl(smartOpsLogo);
}

export function downloadPDF(
  data: Array<object>,
  filename: string,
  fields: string[] = [],
  companyName = "SmartOps",
  titleOverride?: string,
  options: DownloadReportOptions = {}
) {
  void (async () => {
    const title = titleOverride || prettifyFilename(filename.replace(/_report\.pdf$/i, ""));
    const selectedFields = fields.length > 0 ? fields : Object.keys(data[0] ?? {}).slice(0, 4);
    const rows = data.map((row, index) => ({
      index: String(index + 1),
      values: selectedFields.map((field) => formatValue((row as Record<string, unknown>)[field], field)),
    }));

    const generatedAt = new Date().toLocaleString("es-DO");
    void options.subtitle;
    void options.generatedBy;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 36;
    const marginY = 34;
    const contentWidth = pageWidth - marginX * 2;

    const logoData = await getReportLogo(options.companyLogoUrl);

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, marginY, contentWidth, 108, 14, 14, "F");
    doc.setDrawColor(217, 225, 234);
    doc.roundedRect(marginX, marginY, contentWidth, 108, 14, 14, "S");

    const logoX = marginX + 16;
    const logoY = marginY + 14;
    const logoSize = 52;
    if (logoData) {
      doc.addImage(logoData, "PNG", logoX, logoY, logoSize, logoSize);
    }

    const metaWidth = 238;
    const metaHeight = 84;
    const metaX = pageWidth - marginX - metaWidth - 8;
    const metaY = marginY + 12;
    const headerTextX = logoX;
    const headerTextY = logoY + logoSize + 18;
    const headerTextWidth = Math.max(120, metaX - 18 - headerTextX);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    const titleLines = doc.splitTextToSize(title, headerTextWidth).slice(0, 2);
    doc.text(titleLines, headerTextX, headerTextY, { baseline: "top" });

    if (options.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const subtitleLines = doc.splitTextToSize(options.subtitle, headerTextWidth).slice(0, 3);
      doc.text(subtitleLines, headerTextX, headerTextY + 42, { baseline: "top" });
    }

    doc.setFillColor(250, 252, 255);
    doc.roundedRect(metaX, metaY, metaWidth, metaHeight, 12, 12, "F");
    doc.setDrawColor(217, 225, 234);
    doc.roundedRect(metaX, metaY, metaWidth, metaHeight, 12, 12, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("DATOS DEL REPORTE", metaX + 14, metaY + 16);

    const labelX = metaX + 14;
    const valueX = metaX + 92;
    const row1 = metaY + 34;
    const row2 = metaY + 52;
    const row3 = metaY + 70;
    const valueWidth = metaWidth - (valueX - metaX) - 14;

    doc.setDrawColor(227, 233, 241);
    doc.line(metaX + 14, metaY + 22, metaX + metaWidth - 14, metaY + 22);
    doc.line(metaX + 14, row1 + 5, metaX + metaWidth - 14, row1 + 5);
    doc.line(metaX + 14, row2 + 5, metaX + metaWidth - 14, row2 + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.setTextColor(100, 116, 139);
    doc.text("Compania", labelX, row1);
    doc.text("Generado", labelX, row2);
    doc.text("Registros", labelX, row3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.7);
    doc.setTextColor(15, 23, 42);
    doc.text(clipText(doc, companyName, valueWidth), valueX, row1);
    doc.text(clipText(doc, generatedAt, valueWidth), valueX, row2);
    doc.text(String(rows.length), valueX, row3);

    let cursorY = marginY + (options.subtitle ? 144 : 126);

    if (options.summary && options.summary.length > 0) {
      const summaryHeight = 62;
      const summaryGap = 12;
      const summaryWidth = contentWidth;
      const summaryColumns = options.summary.length;
      const summaryColumnWidth = summaryWidth / summaryColumns;

      doc.setFillColor(250, 252, 255);
      doc.roundedRect(marginX, cursorY, summaryWidth, summaryHeight, 12, 12, "F");
      doc.setDrawColor(217, 225, 234);
      doc.roundedRect(marginX, cursorY, summaryWidth, summaryHeight, 12, 12, "S");

      options.summary.forEach((item, index) => {
        const columnX = marginX + index * summaryColumnWidth;
        if (index > 0) {
          doc.setDrawColor(227, 233, 241);
          doc.line(columnX, cursorY + 12, columnX, cursorY + summaryHeight - 12);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(clipText(doc, item.label, summaryColumnWidth - 24), columnX + 12, cursorY + 18);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(clipText(doc, item.value, summaryColumnWidth - 24), columnX + 12, cursorY + 38);
      });

      cursorY += summaryHeight + summaryGap;
    }

    const tableStartY = cursorY;
    const tableHeaderHeight = 24;
    const rowHeight = 20;
    const footerSpace = 44;
    const indexWidth = 32;
    const valueColumnWidth = (contentWidth - indexWidth) / Math.max(selectedFields.length, 1);

    const drawTableHeader = (y: number) => {
      doc.setFillColor(245, 247, 250);
      doc.rect(marginX, y, contentWidth, tableHeaderHeight, "F");
      doc.setDrawColor(217, 225, 234);
      doc.rect(marginX, y, contentWidth, tableHeaderHeight, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text("#", marginX + cellPadding(), y + 15);

      selectedFields.forEach((field, columnIndex) => {
        const x = marginX + indexWidth + columnIndex * valueColumnWidth + cellPadding();
        const label = clipText(doc, getFieldLabel(field), valueColumnWidth - cellPadding() * 2);
        doc.text(label, x, y + 15);
      });
    };

    const drawFooter = () => {
      const footerY = pageHeight - 26;
      doc.setDrawColor(217, 225, 234);
      doc.line(marginX, footerY - 12, pageWidth - marginX, footerY - 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text("SmartOps", marginX, footerY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Documento generado para seguimiento interno.", marginX + 48, footerY);
    };

    drawTableHeader(cursorY);
    cursorY += tableHeaderHeight;

    if (rows.length === 0) {
      doc.setDrawColor(237, 242, 246);
      doc.rect(marginX, cursorY, contentWidth, rowHeight, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("No hay datos disponibles.", marginX + 10, cursorY + 13);
      cursorY += rowHeight;
    } else {
      rows.forEach((row) => {
        if (cursorY + rowHeight + footerSpace > pageHeight) {
          drawFooter();
          doc.addPage();
          cursorY = marginY;
          drawTableHeader(cursorY);
          cursorY += tableHeaderHeight;
        }

        doc.setDrawColor(237, 242, 246);
        doc.rect(marginX, cursorY, contentWidth, rowHeight, "S");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.6);
        doc.setTextColor(30, 41, 59);
        doc.text(row.index, marginX + cellPadding(), cursorY + 13);

        row.values.forEach((value, columnIndex) => {
          const x = marginX + indexWidth + columnIndex * valueColumnWidth + cellPadding();
          doc.text(clipText(doc, value, valueColumnWidth - cellPadding() * 2), x, cursorY + 13);
        });

        cursorY += rowHeight;
      });
    }

    if (tableStartY === cursorY) {
      cursorY += rowHeight;
    }

    drawFooter();
    doc.save(normalizeFilename(filename));
  })();
}
