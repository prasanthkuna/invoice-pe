# InvoicePe

A mobile application for Indian businesses to pay vendors via credit card through PhonePe PG, store and share invoices, and maintain GST-ready records.

## Architecture

- **Frontend**: React Native (Expo)
- **Backend**: Supabase Edge Functions
- **Database**: PostgreSQL (Supabase)
- **Payment Gateway**: PhonePe
- **SMS**: Msg91
- **Monorepo**: pnpm workspaces

## Project Structure

```
├── apps/
│   └── mobile/          # React Native Expo app
├── packages/
│   ├── ui-kit/          # Shared UI components
│   └── types/           # Shared TypeScript types
├── supabase/
│   ├── config.toml      # Supabase configuration
│   ├── migrations/      # Database migrations
│   └── functions/       # Edge Functions
└── .github/
    └── workflows/       # CI/CD pipelines
```

## Development

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
cp apps/mobile/.env.example apps/mobile/.env
# Fill in your Supabase and API keys

# Start Supabase locally
pnpm db:start

# Generate database types
pnpm db:generate

# Start mobile app
pnpm dev

# Run linting
pnpm lint

# Type checking
pnpm type-check
```

## Design System

- **Colors**: Binance-inspired yellow (#F5B80C) with dark theme
- **Typography**: Manrope font family
- **Components**: Minimal, reusable UI components in `@invoicepe/ui-kit`

## Features Implemented

### Phase 1 ✅
- Monorepo setup with pnpm workspaces
- React Native app with Expo
- Design system with Binance-inspired colors
- TypeScript configuration with strict typing
- ESLint + Prettier code quality tools

### Phase 2 ✅
- Remote Supabase setup with CLI
- Database schema with RLS policies applied to remote DB
- OTP-based authentication system
- Edge Functions deployed to remote Supabase
- Vendor management API
- Mobile app authentication flow
- Full remote database connection tested

### Phase 3 ✅
- Complete navigation structure with React Navigation
- Vendor management system (CRUD operations)
- Enhanced UI components and design system
- Form validation and error handling
- Search and filter functionality
- Category management system

## Current Status

✅ **Phase 1, 2 & 3 Complete** - Ready for Phase 4 development
- Remote Supabase project connected and configured
- Database migrations applied successfully
- Edge Functions deployed and tested
- Mobile app authentication flow implemented
- Complete vendor management system implemented
- Navigation structure with React Navigation
- Enhanced UI components and form validation
- All code quality checks passing

**Next Steps:**
- Add Msg91 API keys to `.env` for SMS functionality
- Proceed with Phase 4: Invoice Generation & Management

## Compliance

- **PCI DSS**: SAQ A scope compliance
- **Security**: No PAN storage, tokenized payments only
- **Audit**: Quarterly ASV scans via HackerOne