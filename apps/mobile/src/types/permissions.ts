export enum PermissionType {
  CAMERA = 'camera',
  MEDIA_LIBRARY = 'mediaLibrary',
  NOTIFICATIONS = 'notifications',
  LOCATION = 'location',
  CONTACTS = 'contacts',
}

export interface PermissionContext {
  title: string;
  description: string;
  feature: string;
  benefits: string[];
  fallbackAction?: string;
}

export interface PermissionState {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

export const PERMISSION_CONTEXTS: Record<PermissionType, PermissionContext> = {
  [PermissionType.CAMERA]: {
    title: 'Camera Access',
    description: 'InvoicePe needs camera access to capture invoice photos quickly and accurately.',
    feature: 'photo capture',
    benefits: [
      'Quickly capture invoice photos',
      'Automatic text recognition',
      'Reduce manual data entry',
      'Store digital copies securely'
    ],
    fallbackAction: 'You can still create invoices manually'
  },
  [PermissionType.MEDIA_LIBRARY]: {
    title: 'Photo Library Access',
    description: 'Access your photo library to select existing invoice images.',
    feature: 'photo selection',
    benefits: [
      'Choose from existing photos',
      'Import invoice images',
      'Organize your documents',
      'Backup important receipts'
    ],
    fallbackAction: 'You can use camera or manual entry'
  },
  [PermissionType.NOTIFICATIONS]: {
    title: 'Notification Permission',
    description: 'Get instant updates about payment status and important invoice activities.',
    feature: 'notifications',
    benefits: [
      'Payment status updates',
      'Invoice due date reminders',
      'Transaction confirmations',
      'Security alerts'
    ],
    fallbackAction: 'Check app manually for updates'
  },
  [PermissionType.LOCATION]: {
    title: 'Location Access',
    description: 'Add location information to vendor profiles for better organization.',
    feature: 'location tagging',
    benefits: [
      'Auto-fill vendor addresses',
      'Find nearby vendors',
      'Track business locations',
      'Improve vendor organization'
    ],
    fallbackAction: 'Enter addresses manually'
  },
  [PermissionType.CONTACTS]: {
    title: 'Contacts Access',
    description: 'Import vendor information from your contacts to save time.',
    feature: 'contact import',
    benefits: [
      'Quick vendor setup',
      'Import contact details',
      'Sync phone numbers',
      'Reduce data entry'
    ],
    fallbackAction: 'Add vendor details manually'
  }
};
