// Database types
export type PaymentMethod = 'card' | 'upi' | 'saved_card';
export type PaymentStatus = 'initiated' | 'succeeded' | 'failed';
export type InvoiceStatus = 'pending' | 'paid' | 'failed';
export type CardType = 'VISA' | 'MASTERCARD' | 'RUPAY' | 'AMEX';

export interface User {
  id: string;
  phone: string;
  mobile_number?: string; // For PhonePe payments
  business_name?: string;
  gstin?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  category_id: string;
  upi_id?: string;
  bank_account?: string;
  is_active: boolean;
  phone?: string;
  created_at: string;
  updated_at: string;
  vendor_categories?: VendorCategory;
}

export interface Invoice {
  id: string;
  user_id: string;
  vendor_id: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  pdf_path?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  phonepe_txn_id?: string;
  method: PaymentMethod;
  masked_card?: string;
  saved_card_id?: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface SavedCard {
  id: string;
  user_id: string;
  phonepe_token: string;
  masked_card: string;
  card_type: CardType;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OTPSession {
  id: string;
  phone: string;
  otp_code: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
}

// API Request/Response types
export interface AuthOTPRequest {
  phone: string;
}

export interface AuthOTPResponse {
  success: boolean;
  message: string;
  otp?: string; // Only in development
}

export interface AuthVerifyRequest {
  phone: string;
  otp: string;
}

export interface AuthVerifyResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface VendorRequest {
  name: string;
  category_id: string;
  upi_id?: string;
  bank_account?: string;
  phone?: string;
}

export interface VendorResponse {
  vendor: Vendor;
}

export interface VendorsResponse {
  vendors: Vendor[];
}

// Invoice Request/Response types
export interface InvoiceRequest {
  vendor_id: string;
  amount: number;
  description?: string;
}

export interface InvoiceResponse {
  success: boolean;
  message: string;
  invoice: Invoice;
}

export interface InvoicesResponse {
  success: boolean;
  message: string;
  invoices: Invoice[];
}

export interface InvoiceWithVendor extends Invoice {
  vendors?: Vendor;
}

// Payment Request/Response types
export interface PaymentRequest {
  invoice_id: string;
  method: PaymentMethod;
  mobile_number?: string;
  return_url?: string;
  saved_card_id?: string;
  save_card?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  payment: Payment;
  payment_url?: string;
  phonepe_txn_id?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  message: string;
  payment: Payment;
}

export interface PaymentsResponse {
  success: boolean;
  message: string;
  payments: Payment[];
}

export interface PaymentWithInvoice extends Payment {
  invoices?: InvoiceWithVendor;
}

// PhonePe specific types
export interface PhonePePaymentRequest {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number;
  redirectUrl: string;
  redirectMode: 'POST' | 'REDIRECT';
  callbackUrl: string;
  mobileNumber?: string;
  paymentInstrument: {
    type: 'PAY_PAGE' | 'SAVED_CARD' | 'UPI_COLLECT';
    savedCardId?: string;
    targetApp?: string;
    upiId?: string;
  };
}

// PhonePe Card Tokenization types
export interface PhonePeTokenizeRequest {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  redirectUrl: string;
  redirectMode: 'POST' | 'REDIRECT';
  callbackUrl: string;
  mobileNumber: string;
  paymentInstrument: {
    type: 'CARD';
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    saveCard: boolean;
  };
}

export interface PhonePeTokenizeResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    merchantId: string;
    merchantTransactionId: string;
    instrumentResponse?: {
      type: string;
      maskedCardNumber: string;
      cardType: CardType;
      cardToken: string;
      expiryMonth: string;
      expiryYear: string;
    };
  };
}

export interface PhonePeSavedCardRequest {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number;
  redirectUrl: string;
  redirectMode: 'POST' | 'REDIRECT';
  callbackUrl: string;
  mobileNumber: string;
  paymentInstrument: {
    type: 'SAVED_CARD';
    cardToken: string;
    cvv: string;
  };
}

export interface PhonePePaymentResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    merchantId: string;
    merchantTransactionId: string;
    instrumentResponse?: {
      type: string;
      redirectInfo?: {
        url: string;
        method: string;
      };
    };
  };
}

export interface PhonePeWebhookPayload {
  response: string; // Base64 encoded response
  checksum: string;
}

// Saved Cards API types
export interface SavedCardsResponse {
  success: boolean;
  message: string;
  cards: SavedCard[];
}

export interface SaveCardRequest {
  phonepe_token: string;
  masked_card: string;
  card_type: CardType;
  expiry_month: string;
  expiry_year: string;
  is_default?: boolean;
}

export interface SaveCardResponse {
  success: boolean;
  message: string;
  card?: SavedCard;
}

export interface PhonePeWebhookData {
  merchantId: string;
  merchantTransactionId: string;
  transactionId: string;
  amount: number;
  state: 'COMPLETED' | 'FAILED' | 'PENDING';
  responseCode: string;
  paymentInstrument?: {
    type: string;
    cardType?: string;
    pgTransactionId?: string;
    bankTransactionId?: string;
    pgAuthorizationCode?: string;
    arn?: string;
    bankId?: string;
    brn?: string;
  };
}
