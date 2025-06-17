import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { debugContext } from '../utils/logger';
import type { Invoice, Vendor, User } from '@invoicepe/types';

interface GeneratePDFOptions {
  invoice: Invoice;
  vendor: Vendor;
  user: User;
}

export class PDFService {
  static async generateInvoicePDF({ invoice, vendor, user }: GeneratePDFOptions): Promise<string> {
    try {
      debugContext.invoice({ 
        step: 'generating_pdf', 
        invoiceId: invoice.id,
        vendorId: vendor.id,
        userId: user.id 
      });

      const html = this.generateInvoiceHTML({ invoice, vendor, user });
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612, // A4 width in points
        height: 792, // A4 height in points
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });

      debugContext.invoice({ 
        step: 'pdf_generated_successfully', 
        invoiceId: invoice.id,
        pdfUri: uri 
      });

      return uri;
    } catch (error) {
      debugContext.error('invoice', error as Error, { 
        step: 'pdf_generation_failed',
        invoiceId: invoice.id 
      });
      throw error;
    }
  }

  static async shareInvoicePDF(pdfUri: string, invoiceId: string): Promise<void> {
    try {
      debugContext.invoice({ 
        step: 'sharing_pdf', 
        invoiceId,
        pdfUri 
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${invoiceId}`,
        UTI: 'com.adobe.pdf',
      });

      debugContext.invoice({ 
        step: 'pdf_shared_successfully', 
        invoiceId 
      });
    } catch (error) {
      debugContext.error('invoice', error as Error, { 
        step: 'pdf_sharing_failed',
        invoiceId 
      });
      throw error;
    }
  }

  private static generateInvoiceHTML({ invoice, vendor, user }: GeneratePDFOptions): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${invoice.id}</title>
          <style>
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #f5b80c;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #f5b80c;
              margin-bottom: 5px;
            }
            .invoice-title {
              font-size: 24px;
              color: #333;
              margin-top: 10px;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
            }
            .invoice-info, .vendor-info {
              width: 48%;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #f5b80c;
              margin-bottom: 10px;
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
            }
            .info-row {
              margin-bottom: 8px;
            }
            .label {
              font-weight: bold;
              color: #666;
            }
            .amount-section {
              margin-top: 40px;
              text-align: right;
            }
            .amount-row {
              margin-bottom: 10px;
              font-size: 18px;
            }
            .total-amount {
              font-size: 24px;
              font-weight: bold;
              color: #f5b80c;
              border-top: 2px solid #f5b80c;
              padding-top: 10px;
              margin-top: 20px;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-paid {
              background-color: #12c65e;
              color: white;
            }
            .status-pending {
              background-color: #f5b80c;
              color: white;
            }
            .status-failed {
              background-color: #e54848;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${user.business_name || 'InvoicePe User'}</div>
            ${user.gstin ? `<div>GSTIN: ${user.gstin}</div>` : ''}
            <div class="invoice-title">INVOICE</div>
          </div>

          <div class="invoice-details">
            <div class="invoice-info">
              <div class="section-title">Invoice Details</div>
              <div class="info-row">
                <span class="label">Invoice ID:</span> ${invoice.id.substring(0, 8)}
              </div>
              <div class="info-row">
                <span class="label">Date:</span> ${formatDate(invoice.created_at)}
              </div>
              <div class="info-row">
                <span class="label">Status:</span> 
                <span class="status-badge status-${invoice.status}">${invoice.status}</span>
              </div>
              ${invoice.description ? `
                <div class="info-row">
                  <span class="label">Description:</span> ${invoice.description}
                </div>
              ` : ''}
            </div>

            <div class="vendor-info">
              <div class="section-title">Vendor Details</div>
              <div class="info-row">
                <span class="label">Name:</span> ${vendor.name}
              </div>
              ${vendor.phone ? `
                <div class="info-row">
                  <span class="label">Phone:</span> ${vendor.phone}
                </div>
              ` : ''}
              ${vendor.upi_id ? `
                <div class="info-row">
                  <span class="label">UPI ID:</span> ${vendor.upi_id}
                </div>
              ` : ''}
              ${vendor.bank_account ? `
                <div class="info-row">
                  <span class="label">Bank Account:</span> ${vendor.bank_account}
                </div>
              ` : ''}
            </div>
          </div>

          <div class="amount-section">
            <div class="amount-row">
              <span class="label">Amount:</span> ${formatCurrency(Number(invoice.amount))}
            </div>
            <div class="total-amount">
              Total: ${formatCurrency(Number(invoice.amount))}
            </div>
          </div>

          <div class="footer">
            <p>Generated by InvoicePe on ${formatDate(new Date().toISOString())}</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </body>
      </html>
    `;
  }
}
