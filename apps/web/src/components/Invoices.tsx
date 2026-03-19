import { useMemo, useState, type ElementType, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { BRAND } from '../config/brand';
import {
  Search,
  FileText,
  Download,
  DollarSign,
  X,
  Lock,
  CheckCircle,
  Clock,
  AlertTriangle,
  Receipt,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { formatCurrency, safeCurrency } from '@shared/utils/currency';
import { Invoice } from '../types';

export function Invoices() {
  const {
    invoices,
    payments,
    featureAccess,
    addPayment,
    canPerform,
    currentWorkspace,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const workspaceCurrency = currentWorkspace.defaultCurrency || 'GHS';

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const customerName = inv.order?.customer?.fullName || '';
      return (
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        customerName.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [invoices, search]);

  const selectedInvoiceData = invoices.find((invoice) => invoice.id === selectedInvoice);
  const invoicePayments = payments.filter((payment) => payment.invoiceId === selectedInvoice);

  const paidInvoicesCount = invoices.filter((invoice) => invoice.status === 'paid').length;
  const overdueInvoicesCount = invoices.filter((invoice) => invoice.status === 'overdue').length;
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0);

  const exportInvoicePdf = (invoice: Invoice) => {
    if (!featureAccess.canExportPdf.allowed) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const brandColor = currentWorkspace.brandColor || '#0F6E8C';
    const brandRgb = hexToRgb(brandColor) || { r: 15, g: 110, b: 140 };
    const logoUrl = currentWorkspace.logoUrl || null;
    const useWatermark = Boolean(currentWorkspace.useLogoAsWatermark && logoUrl);
    const currency = safeCurrency(invoice.currency, workspaceCurrency);

    const customerName = invoice.order?.customer?.fullName || 'Walk-in Customer';
    const customerPhone = invoice.order?.customer?.phone || '';
    const customerEmail = invoice.order?.customer?.email || '';
    const customerAddress = invoice.order?.customer?.address || '';
    const orderNumber = invoice.order?.orderNumber || '-';
    const orderType = invoice.order?.orderType || 'Custom Order';

    let y = 18;

    if (useWatermark && logoUrl) {
      try {
        doc.saveGraphicsState();
        // @ts-expect-error jspdf plugin support varies by version
        if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.08 }));
        doc.addImage(logoUrl, 'PNG', 35, 65, 140, 140, undefined, 'FAST');
        doc.restoreGraphicsState();
      } catch {
        // ignore watermark errors
      }
    }

    if (logoUrl) {
      try {
        doc.addImage(logoUrl, 'PNG', 14, 12, 24, 24, undefined, 'FAST');
      } catch {
        // ignore logo errors
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(34, 34, 34);
    doc.text(currentWorkspace.name || BRAND.productName, 44, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text('Professional Invoice', 44, 27);

    doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.roundedRect(pageWidth - 52, 14, 38, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 33, 22, { align: 'center' });

    y = 46;

    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, y, pageWidth - 28, 28, 4, 4, 'FD');

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Number', 20, y + 8);
    doc.text('Issue Date', 75, y + 8);
    doc.text('Due Date', 120, y + 8);
    doc.text('Status', 165, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(35, 35, 35);
    doc.text(invoice.invoiceNumber, 20, y + 18);
    doc.text(format(new Date(invoice.issueDate), 'MMM d, yyyy'), 75, y + 18);
    doc.text(format(new Date(invoice.dueDate), 'MMM d, yyyy'), 120, y + 18);
    doc.text(invoice.status.replace('_', ' '), 165, y + 18);

    y += 40;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Bill To', 14, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(customerName, 14, y + 8);
    if (customerPhone) doc.text(customerPhone, 14, y + 14);
    if (customerEmail) doc.text(customerEmail, 14, y + 20);
    if (customerAddress) {
      const wrappedAddress = doc.splitTextToSize(customerAddress, 80);
      doc.text(wrappedAddress, 14, y + 26);
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Order Details', 120, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    doc.text(`Order No: ${orderNumber}`, 120, y + 8);
    doc.text(`Order Type: ${orderType}`, 120, y + 14);
    if (invoice.order?.dueDate) {
      doc.text(
        `Order Due: ${format(new Date(invoice.order.dueDate), 'MMM d, yyyy')}`,
        120,
        y + 20
      );
    }

    y += 40;

    doc.setFillColor(brandRgb.r, brandRgb.g, brandRgb.b);
    doc.rect(14, y, pageWidth - 28, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Description', 18, y + 6.5);
    doc.text('Qty', 122, y + 6.5, { align: 'right' });
    doc.text('Unit Price', 155, y + 6.5, { align: 'right' });
    doc.text('Line Total', 194, y + 6.5, { align: 'right' });

    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    invoice.items.forEach((item, index) => {
      const rowHeight = 10;

      if (y + rowHeight > 250) {
        doc.addPage();
        y = 20;
      }

      if (index % 2 === 0) {
        doc.setFillColor(249, 249, 251);
        doc.rect(14, y, pageWidth - 28, rowHeight, 'F');
      }

      const wrappedDescription = doc.splitTextToSize(item.description, 95);
      const dynamicHeight = Math.max(rowHeight, wrappedDescription.length * 5 + 4);

      if (index % 2 === 0) {
        doc.setFillColor(249, 249, 251);
        doc.rect(14, y, pageWidth - 28, dynamicHeight, 'F');
      }

      doc.text(wrappedDescription, 18, y + 6);
      doc.text(String(item.quantity), 122, y + 6, { align: 'right' });
      doc.text(formatCurrency(item.unitPrice, currency), 155, y + 6, {
        align: 'right',
      });
      doc.text(formatCurrency(item.lineTotal, currency), 194, y + 6, {
        align: 'right',
      });

      y += dynamicHeight;
    });

    y += 8;

    const totalsX = 118;
    const totalsWidth = pageWidth - totalsX - 14;
    const lineGap = 8;

    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(totalsX, y, totalsWidth, 40, 4, 4, 'FD');

    let totalsY = y + 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Subtotal', totalsX + 4, totalsY);
    doc.text(formatCurrency(invoice.subtotal, currency), totalsX + totalsWidth - 4, totalsY, {
      align: 'right',
    });

    totalsY += lineGap;
    doc.text('Tax', totalsX + 4, totalsY);
    doc.text(formatCurrency(invoice.taxTotal, currency), totalsX + totalsWidth - 4, totalsY, {
      align: 'right',
    });

    totalsY += lineGap;
    doc.text('Discount', totalsX + 4, totalsY);
    doc.text(
      `- ${formatCurrency(invoice.discountTotal, currency)}`,
      totalsX + totalsWidth - 4,
      totalsY,
      { align: 'right' }
    );

    totalsY += lineGap;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Total', totalsX + 4, totalsY);
    doc.text(formatCurrency(invoice.totalAmount, currency), totalsX + totalsWidth - 4, totalsY, {
      align: 'right',
    });

    y += 52;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('Payment Summary', 14, y);

    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70);
    doc.text(`Paid Amount: ${formatCurrency(invoice.paidAmount, currency)}`, 14, y);

    y += 7;
    doc.text(`Balance Due: ${formatCurrency(invoice.balanceDue, currency)}`, 14, y);

    y += 14;

    const paymentsForInvoice = payments.filter((payment) => payment.invoiceId === invoice.id);

    if (paymentsForInvoice.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('Recorded Payments', 14, y);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);

      paymentsForInvoice.forEach((payment) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        doc.text(
          `${format(new Date(payment.paidAt), 'MMM d, yyyy')} â€¢ ${payment.method} â€¢ ${formatCurrency(
            payment.amount,
            currency
          )}`,
          14,
          y
        );
        y += 7;
      });
    }

    doc.setDrawColor(235, 235, 235);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated by ${BRAND.productName}`, 14, pageHeight - 10);
    doc.text(currentWorkspace.name || BRAND.productName, pageWidth - 14, pageHeight - 10, {
      align: 'right',
    });

    doc.save(`${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-medium text-[#0F6E8C]">
            <Receipt className="h-4 w-4" />
            {BRAND.productName} Invoice Management
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-1 text-slate-500">
            {invoices.length} total invoices
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Invoices"
          value={String(invoices.length)}
          subtitle="All generated invoices"
          icon={FileText}
          tone="brand"
        />
        <SummaryCard
          title="Paid Invoices"
          value={String(paidInvoicesCount)}
          subtitle="Invoices fully settled"
          icon={CheckCircle}
          tone="green"
        />
        <SummaryCard
          title="Outstanding Balance"
          value={formatCurrency(totalOutstanding, workspaceCurrency)}
          subtitle={`${overdueInvoicesCount} overdue invoice${overdueInvoicesCount === 1 ? '' : 's'}`}
          icon={Wallet}
          tone="amber"
        />
      </div>

      <div className="relative mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search invoices by invoice number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl py-3 pl-11 pr-4 text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#0F6E8C]"
        />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-[#0F6E8C]" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm text-slate-500">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Issue Date</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
                <th className="px-5 py-3 font-medium text-right">Balance</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="cursor-pointer text-sm hover:bg-slate-50"
                  onClick={() => setSelectedInvoice(inv.id)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{inv.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{inv.order?.customer?.fullName}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {format(new Date(inv.issueDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        inv.status === 'overdue'
                          ? 'font-medium text-red-600'
                          : 'text-slate-600'
                      }
                    >
                      {format(new Date(inv.dueDate), 'MMM d, yyyy')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <InvoiceStatusBadge status={inv.status} />
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(inv.totalAmount, safeCurrency(inv.currency, workspaceCurrency))}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className={
                        inv.balanceDue > 0 ? 'font-medium text-amber-600' : 'text-green-600'
                      }
                    >
                      {formatCurrency(inv.balanceDue, safeCurrency(inv.currency, workspaceCurrency))}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportInvoicePdf(inv);
                      }}
                      disabled={!featureAccess.canExportPdf.allowed}
                      className={`rounded-xl p-2 transition-colors ${
                        featureAccess.canExportPdf.allowed
                          ? 'text-slate-600 hover:bg-slate-100'
                          : 'cursor-not-allowed text-slate-300'
                      }`}
                      title={featureAccess.canExportPdf.allowed ? 'Download PDF' : 'Pro feature'}
                    >
                      {featureAccess.canExportPdf.allowed ? (
                        <Download className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredInvoices.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-white py-12 text-center">
          <p className="text-slate-500">No invoices found</p>
        </div>
      )}

      {selectedInvoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-xl">
            <div className="h-1.5 w-full bg-[#0F6E8C]" />

            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedInvoiceData.invoiceNumber}
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedInvoiceData.order?.customer?.fullName}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
              <div className="mb-6 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <InvoiceStatusBadge status={selectedInvoiceData.status} />
                  <p className="mt-1 text-sm text-slate-500">
                    Due: {format(new Date(selectedInvoiceData.dueDate), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(
                      selectedInvoiceData.totalAmount,
                      safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                    )}
                  </p>
                  {selectedInvoiceData.balanceDue > 0 && (
                    <p className="text-sm text-amber-600">
                      Balance:{' '}
                      {formatCurrency(
                        selectedInvoiceData.balanceDue,
                        safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-900">Line Items</h3>

                  <button
                    onClick={() => exportInvoicePdf(selectedInvoiceData)}
                    disabled={!featureAccess.canExportPdf.allowed}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      featureAccess.canExportPdf.allowed
                        ? 'bg-[#0F6E8C] text-white hover:bg-[#0C5C74]'
                        : 'cursor-not-allowed bg-slate-100 text-slate-400'
                    }`}
                  >
                    {featureAccess.canExportPdf.allowed ? (
                      <Download className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    Export PDF
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-600">
                          Description
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-slate-600">Qty</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-600">Price</th>
                        <th className="px-4 py-2 text-right font-medium text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoiceData.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-slate-900">{item.description}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatCurrency(
                              item.unitPrice,
                              safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {formatCurrency(
                              item.lineTotal,
                              safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-900">
                      {formatCurrency(
                        selectedInvoiceData.subtotal,
                        safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax</span>
                    <span className="text-slate-900">
                      {formatCurrency(
                        selectedInvoiceData.taxTotal,
                        safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                      )}
                    </span>
                  </div>
                  {selectedInvoiceData.discountTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Discount</span>
                      <span className="text-green-600">
                        -{' '}
                        {formatCurrency(
                          selectedInvoiceData.discountTotal,
                          safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-medium">
                    <span className="text-slate-900">Total</span>
                    <span className="text-slate-900">
                      {formatCurrency(
                        selectedInvoiceData.totalAmount,
                        safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-slate-900">Payment History</h3>
                {invoicePayments.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No payments recorded
                  </p>
                ) : (
                  <div className="space-y-2">
                    {invoicePayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-2xl bg-green-50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {formatCurrency(
                                payment.amount,
                                safeCurrency(selectedInvoiceData.currency, workspaceCurrency)
                              )}{' '}
                              via {payment.method}
                            </p>
                            <p className="text-xs text-slate-500">
                              {format(new Date(payment.paidAt), 'MMM d, yyyy')}
                              {payment.notes ? ` â€¢ ${payment.notes}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 p-4">
              {selectedInvoiceData.balanceDue > 0 && canPerform('manage_payments') && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700"
                >
                  <DollarSign className="h-4 w-4" />
                  Record Payment
                </button>
              )}
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedInvoiceData && (
        <PaymentModal
          invoice={{ balanceDue: selectedInvoiceData.balanceDue }}
          currency={safeCurrency(selectedInvoiceData.currency, workspaceCurrency)}
          onClose={() => setShowPaymentModal(false)}
          onAddPayment={(amount, method, notes) => {
            addPayment({
              orderId: selectedInvoiceData.orderId,
              invoiceId: selectedInvoiceData.id,
              amount,
              method,
              referenceCode: `PAY-${Date.now()}`,
              paymentStatus: 'captured',
              paidAt: new Date(),
              notes,
            });
            setShowPaymentModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ElementType;
  tone: 'brand' | 'green' | 'amber';
}) {
  const tones = {
    brand: 'bg-sky-50 text-[#0F6E8C]',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className={`rounded-2xl p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: ElementType }> = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock },
    sent: { bg: 'bg-sky-100', text: 'text-sky-700', icon: Clock },
    partial: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
    void: { bg: 'bg-slate-100', text: 'text-slate-500', icon: Clock },
  };

  const { bg, text, icon: Icon } = config[status] || config.draft;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${bg} ${text}`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function PaymentModal({
  invoice,
  currency,
  onClose,
  onAddPayment,
}: {
  invoice: { balanceDue: number };
  currency: string;
  onClose: () => void;
  onAddPayment: (amount: number, method: string, notes: string) => void;
}) {
  const [amount, setAmount] = useState(invoice.balanceDue.toString());
  const [method, setMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0 && parsedAmount <= invoice.balanceDue) {
      onAddPayment(parsedAmount, method, notes);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[24px] bg-white shadow-xl">
        <div className="h-1.5 w-full bg-green-600" />

        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Record Payment</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Amount (Balance: {formatCurrency(invoice.balanceDue, currency)})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={invoice.balanceDue}
              step="0.01"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Payment Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option>Cash</option>
              <option>Credit Card</option>
              <option>Bank Transfer</option>
              <option>Check</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return null;

  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}
