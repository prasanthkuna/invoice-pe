/**
 * MVP Analytics - Simple event tracking (10 lines)
 * Future: Replace with Mixpanel/Amplitude for production
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

class MVPAnalytics {
  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: new Date().toISOString()
    };
    
    // MVP: Simple console logging
    console.log('📊 Analytics:', analyticsEvent);
    
    // Future: Send to analytics service
    // mixpanel.track(event, properties);
  }

  // Common events for MVP tracking
  invoiceCreated(amount: number, vendorId: string) {
    this.track('invoice_created', { amount, vendorId });
  }

  paymentSent(amount: number, method: string) {
    this.track('payment_sent', { amount, method });
  }

  paymentCompleted(amount: number, duration: number) {
    this.track('payment_completed', { amount, duration });
  }

  userSignup(phone: string) {
    this.track('user_signup', { phone: phone.substring(0, 6) + 'XXXX' }); // Privacy
  }

  appOpened() {
    this.track('app_opened');
  }

  exportLedger(invoiceCount: number) {
    this.track('ledger_exported', { invoiceCount });
  }

  errorOccurred(feature: string, error: string) {
    this.track('error_occurred', { feature, error });
  }
}

// Global analytics instance
export const analytics = new MVPAnalytics();

// Auto-track app opens
if (__DEV__) {
  analytics.appOpened();
}
