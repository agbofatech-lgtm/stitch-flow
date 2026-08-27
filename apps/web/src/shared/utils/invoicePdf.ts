import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import type { ApiInvoice } from '@shared/api/invoices';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';

export type InvoicePdfBranding = {
  workspaceName?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
  useLogoAsWatermark?: boolean;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

type InvoiceLineItem = {
  label: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

function loadImageAsDataUrl(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
}

function safeText(value?: string | null, fallback = '—') {
  return value && value.trim() ? value.trim() : fallback;
}

function toLineItems(invoice: ApiInvoice): InvoiceLineItem[] {
  const invoiceRecord = invoice as ApiInvoice & Record<string, unknown>;
  const candidateSources = [
    invoiceRecord.items,
    invoiceRecord.lineItems,
    invoiceRecord.invoiceItems,
    invoiceRecord.summaryItems,
  ];

  for (const source of candidateSources) {
    if (!Array.isArray(source) || source.length === 0) continue;

    const mapped = source
      .map((raw) => {
        const item = raw as Record<string, unknown> & {
          quantity?: number; qty?: number; unitPrice?: number; rate?: number;
          price?: number; amount?: number; label?: string; description?: string;
          name?: string; title?: string;
        };
        const quantity = Number(item.quantity ?? item.qty ?? 1);
        const unitPrice = Number(item.unitPrice ?? item.rate ?? item.price ?? item.amount ?? 0);
        const amount = Number(item.amount ?? quantity * unitPrice);

        return {
          label: String(item.label ?? item.name ?? item.title ?? 'Work Item'),
          description: item.description ? String(item.description) : '',
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
          amount: Number.isFinite(amount) ? amount : 0,
        };
      })
      .filter((item) => item.label);

    if (mapped.length > 0) {
      return mapped;
    }
  }

  return [
    {
      label: safeText(invoiceRecord.orderType as string | undefined, 'Tailoring Work'),
      description: safeText(invoice.notes, ''),
      quantity: 1,
      unitPrice: Number(invoice.totalAmount || 0),
      amount: Number(invoice.totalAmount || 0),
    },
  ];
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5
) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export async function downloadInvoicePdf(
  invoice: ApiInvoice,
  customerName?: string,
  branding?: InvoicePdfBranding
) {
  const doc = new jsPDF();
  const currency = safeCurrency(invoice.currency);
  const brandColor = branding?.brandColor || '#0F6E8C';
  const workspaceName = branding?.workspaceName || 'StitchFlow Workspace';
  const logoSource = branding?.logoUrl || stitchflowLogo;
  const logoDataUrl = await loadImageAsDataUrl(logoSource);
  const lineItems = toLineItems(invoice);
  // (payment stamp text derives from balance at render time)

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;

  if (branding?.useLogoAsWatermark && logoDataUrl) {
    try {
      doc.saveGraphicsState();
      // jsPDF ships GState at runtime without type declarations; narrowly
      // scoped structural cast (documented external-library exception).
      const gstateDoc = doc as unknown as {
        setGState?: (state: unknown) => void;
        GState?: new (options: { opacity: number }) => unknown;
      };
      if (gstateDoc.setGState && gstateDoc.GState) {
        gstateDoc.setGState(new gstateDoc.GState({ opacity: 0.045 }));
      }
      doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), 58, 95, 82, 82);
      doc.restoreGraphicsState();
    } catch {
      // jsPDF image embedding is best-effort; PDF remains valid without it
    }
  }

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(left, 12, pageWidth - 28, 34, 4, 4, 'F');

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), left + 2, 16, 22, 22);
    } catch {
      // jsPDF image embedding is best-effort; PDF remains valid without it
    }
  }

  doc.setTextColor(30, 41, 51);
  doc.setFontSize(15);
  doc.text(workspaceName, left + 30, 22);

  doc.setFontSize(9);
  let companyY = 28;

  if (branding?.phone) {
    doc.text(`Phone: ${branding.phone}`, left + 30, companyY);
    companyY += 4.5;
  }

  if (branding?.email) {
    doc.text(`Email: ${branding.email}`, left + 30, companyY);
    companyY += 4.5;
  }

  if (branding?.address) {
    const wrappedAddress = doc.splitTextToSize(`Address: ${branding.address}`, 72);
    doc.text(wrappedAddress, left + 30, companyY);
  }

  doc.setTextColor(15, 110, 140);
  doc.setFontSize(20);
  doc.text('INVOICE', right - 2, 23, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${format(new Date(), 'MMM d, yyyy')}`, right - 2, 29, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(left, 52, right, 52);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(left, 58, 86, 32, 3, 3);
  doc.roundedRect(right - 66, 58, 66, 32, 3, 3);

  doc.setFontSize(10);
  doc.setTextColor(brandColor);
  doc.text('Bill To', left + 4, 66);

  doc.setTextColor(30, 41, 51);
  doc.setFontSize(11);
  doc.text(customerName || 'Walk-in Customer', left + 4, 74);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Customer ID: ${safeText(invoice.customerId)}`, left + 4, 81);

  doc.setFontSize(10);
  doc.setTextColor(brandColor);
  doc.text('Invoice Details', right - 62, 66);

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, right - 62, 74);
  doc.text(`Status: ${invoice.status}`, right - 62, 79);
  doc.text(
    `Due: ${invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'}`,
    right - 62,
    84
  );

  let currentY = 102;

  doc.setFillColor(15, 110, 140);
  doc.roundedRect(left, currentY, pageWidth - 28, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text('Item / Work Description', left + 4, currentY + 6.5);
  doc.text('Qty', 124, currentY + 6.5, { align: 'right' });
  doc.text('Rate', 154, currentY + 6.5, { align: 'right' });
  doc.text('Amount', right - 4, currentY + 6.5, { align: 'right' });

  currentY += 12;

  doc.setTextColor(30, 41, 51);
  doc.setFontSize(9);

  lineItems.forEach((item) => {
    const description = item.description?.trim()
      ? `${item.label} — ${item.description.trim()}`
      : item.label;

    const wrapped = doc.splitTextToSize(description, 95);
    const rowHeight = Math.max(10, wrapped.length * 4.5 + 4);

    if (currentY + rowHeight > 245) {
      doc.addPage();
      currentY = 24;
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(left, currentY + rowHeight, right, currentY + rowHeight);

    doc.text(wrapped, left + 4, currentY + 5);
    doc.text(String(item.quantity), 124, currentY + 5, { align: 'right' });
    doc.text(formatCurrency(item.unitPrice, currency), 154, currentY + 5, { align: 'right' });
    doc.text(formatCurrency(item.amount, currency), right - 4, currentY + 5, { align: 'right' });

    currentY += rowHeight;
  });

  currentY += 8;

  const summaryBoxX = 118;
  const summaryBoxW = right - summaryBoxX;
  doc.roundedRect(summaryBoxX, currentY, summaryBoxW, 28, 3, 3);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal', summaryBoxX + 4, currentY + 7);
  doc.text('Paid', summaryBoxX + 4, currentY + 14);
  doc.text('Balance', summaryBoxX + 4, currentY + 21);

  doc.setTextColor(30, 41, 51);
  doc.text(formatCurrency(invoice.totalAmount, currency), right - 4, currentY + 7, { align: 'right' });
  doc.text(formatCurrency(invoice.amountPaid, currency), right - 4, currentY + 14, { align: 'right' });

  doc.setTextColor(invoice.balanceDue > 0 ? 180 : 22, invoice.balanceDue > 0 ? 120 : 163, invoice.balanceDue > 0 ? 40 : 74);
  doc.text(formatCurrency(invoice.balanceDue, currency), right - 4, currentY + 21, { align: 'right' });

  currentY += 38;

  if (invoice.notes) {
    doc.setTextColor(brandColor);
    doc.setFontSize(11);
    doc.text('Notes', left, currentY);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    currentY = drawWrappedText(doc, invoice.notes, left, currentY + 7, 182, 4.5);
  }

  const footerY = pageHeight - 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(left, footerY - 6, right, footerY - 6);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.text(`Generated by StitchFlow`, left, footerY);
  doc.text(workspaceName, right, footerY, { align: 'right' });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}



