import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Order } from '../../types';

export async function downloadJobCardPdf(order: Order, branding: any) {
  const doc = new jsPDF();

  const left = 14;
  const right = 196;

  // HEADER
  doc.setFontSize(16);
  doc.text(branding?.workspaceName || 'StitchFlow', left, 20);

  doc.setFontSize(10);
  doc.text(`Phone: ${branding?.phone || '-'}`, left, 26);
  doc.text(`Email: ${branding?.email || '-'}`, left, 32);

  doc.setFontSize(18);
  doc.text('JOB CARD', right, 20, { align: 'right' });

  // LINE
  doc.line(left, 40, right, 40);

  // ORDER INFO
  doc.setFontSize(11);
  doc.text(`Order #: ${order.orderNumber}`, left, 50);
  doc.text(`Status: ${order.status}`, left, 56);
  doc.text(`Type: ${order.orderType}`, left, 62);

  if (order.dueDate) {
    doc.text(`Due: ${format(new Date(order.dueDate), 'MMM d, yyyy')}`, left, 68);
  }

  // CUSTOMER
  doc.text('Customer', left, 80);
  doc.setFontSize(10);
  doc.text(order.customer?.fullName || 'Walk-in', left, 86);

  // MEASUREMENTS
  let y = 100;
  doc.setFontSize(12);
  doc.text('Measurements', left, y);

  y += 6;

  if (order.measurementSnapshot) {
    Object.entries(order.measurementSnapshot).forEach(([key, value]) => {
      if (!value) return;
      doc.setFontSize(9);
      doc.text(`${key}: ${value}`, left, y);
      y += 5;
    });
  }

  // MATERIALS
  y += 6;
  doc.setFontSize(12);
  doc.text('Materials', left, y);

  y += 6;

  if ((order as any).materials?.length) {
    (order as any).materials.forEach((m: any) => {
      doc.setFontSize(9);
      doc.text(`${m.name} - ${m.quantity}`, left, y);
      y += 5;
    });
  } else {
    doc.setFontSize(9);
    doc.text('No materials assigned', left, y);
    y += 5;
  }

  // NOTES
  y += 6;
  doc.setFontSize(12);
  doc.text('Notes', left, y);

  y += 6;
  doc.setFontSize(9);
  doc.text(order.notes || '-', left, y);

  doc.save(`JOB-${order.orderNumber}.pdf`);
}
