# 🔍 InvoicePe AI-Assisted Debugging Tools

Minimal, high-performance debugging system that leverages Supabase's existing infrastructure for AI-assisted troubleshooting.

## 🎯 Overview

This debugging system provides:
- **Minimal code overhead** (90% less than traditional logging)
- **AI-friendly analysis** with natural language queries
- **Automatic pattern detection** and suggestions
- **Real-time debugging** with Supabase integration
- **Feature-specific debuggers** for focused analysis

## 🚀 Quick Start

### Setup (One-time)
```bash
cd debug-tools
npm run setup
```

### Basic Usage
```bash
# General debugging
node supabase-debug.js "card adding broke"

# Feature-specific debugging
npm run debug:card
npm run debug:payment
npm run debug:sms
```

## 📋 Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `node supabase-debug.js "query"` | General AI debugging | `"payment failed"` |
| `npm run debug:card` | Card management issues | Card tokenization, saving |
| `npm run debug:payment` | Payment problems | PhonePe integration, failures |
| `npm run debug:sms` | SMS/OTP issues | MSG91 integration, delivery |
| `npm run debug:auth` | Authentication problems | Login, OTP verification |
| `npm run card:specific` | Detailed card analysis | Deep card debugging |

## 🔧 How It Works

### 1. Database Triggers (Automatic)
- **Smart triggers** automatically log significant database operations
- **Zero code changes** required in your app
- **Performance optimized** - only logs important events

### 2. Mobile Debug Context (Minimal)
```typescript
import { debugContext } from '../utils/logger';

// Simple logging (3 lines of code)
debugContext.cardManagement({ step: 'tokenization', cardType: 'VISA' });
debugContext.payment({ amount: 1000, method: 'card' });
debugContext.error('card-management', error, { step: 'save' });
```

### 3. AI Analysis (Automatic)
- **Pattern detection** across all logs
- **Error correlation** between frontend/backend
- **Smart suggestions** based on common issues
- **Natural language** queries

## 📊 Debug Context Schema

The system uses a single `debug_context` table:

```sql
CREATE TABLE debug_context (
    id UUID PRIMARY KEY,
    feature TEXT NOT NULL,        -- 'card-management', 'payment', etc.
    session_id TEXT,              -- Mobile session ID
    user_id UUID,                 -- User reference
    context JSONB NOT NULL,       -- Debug data
    created_at TIMESTAMPTZ        -- Timestamp
);
```

## 🎯 Usage Examples

### Card Adding Issues
```bash
# You say: "Card adding is broken"
node supabase-debug.js "card adding broke"

# AI analyzes:
# ✅ 15 card-management logs found
# ❌ 3 tokenization errors detected
# 🔧 Suggested fix: Check PhonePe API timeout
```

### Payment Failures
```bash
# You say: "Payments are failing"
npm run debug:payment

# AI shows:
# 💰 5 failed payments in last hour
# 🔧 Common error: "Invalid merchant ID"
# 💡 Check PhonePe configuration
```

### SMS Not Working
```bash
# You say: "SMS not sending"
node supabase-debug.js "sms issues"

# AI finds:
# 📱 MSG91 API errors: 207 (Invalid auth key)
# 🔧 Check authkey in environment variables
```

## 🔍 Feature-Specific Debuggers

### Card Management Debugger
```bash
npm run card:specific
```
- Analyzes card tokenization flow
- Checks PhonePe integration
- Reviews saved card status
- Identifies payment failures

### Advanced Queries
```bash
# Time-specific debugging
node supabase-debug.js "payment issues last 2 hours"

# User-specific debugging  
node supabase-debug.js "user payment problems"

# Error pattern analysis
node supabase-debug.js "recurring card errors"
```

## 📁 File Structure

```
debug-tools/
├── supabase-debug.js           # Main AI debugging tool
├── setup-debug.js              # One-time setup script
├── package.json                # Dependencies and scripts
├── feature-debuggers/
│   ├── card-debug.js           # Card-specific debugging
│   └── payment-debug.js        # Payment-specific debugging
├── debug-report.json           # Latest debug report
└── README.md                   # This file
```

## 🎛️ Configuration

### Environment Variables
```bash
# Required in apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Setup
The setup script automatically:
1. Creates `debug_context` table
2. Adds smart triggers to relevant tables
3. Sets up indexes for performance
4. Configures RLS policies

## 🚀 Performance Benefits

### Before (Complex Logging)
- **Mobile**: 200+ lines of logging code
- **Backend**: 150+ lines of middleware  
- **Database**: Multiple log tables
- **Queries**: Complex joins and aggregations

### After (Minimal System)
- **Mobile**: 10 lines of code
- **Backend**: Leverage existing Supabase logs
- **Database**: 1 table + automatic triggers
- **Queries**: Simple, indexed lookups

## 💡 AI Debugging Features

### Pattern Detection
- **Error clustering** - Groups similar errors
- **Frequency analysis** - Identifies recurring issues
- **Timeline correlation** - Links related events
- **User impact** - Shows affected users

### Smart Suggestions
- **Feature-specific** recommendations
- **Common fix** patterns
- **Configuration** checks
- **API integration** guidance

### Natural Language
- **"Card adding broke"** → Analyzes card management
- **"Payment failed"** → Reviews payment flow
- **"SMS not working"** → Checks MSG91 integration
- **"User can't login"** → Examines auth flow

## 🔧 Troubleshooting

### Common Issues

**"No logs found"**
- Check if debug triggers are installed
- Verify environment variables
- Ensure recent app activity

**"Database connection failed"**
- Verify Supabase credentials
- Check network connectivity
- Confirm service role key permissions

**"Edge Function logs missing"**
- Install Supabase CLI: `npm install -g @supabase/cli`
- Login: `supabase login`
- Check project connection

### Debug the Debugger
```bash
# Test database connection
node -e "console.log(process.env.EXPO_PUBLIC_SUPABASE_URL)"

# Check debug table
supabase sql --db-url="$SUPABASE_DB_URL" --query="SELECT COUNT(*) FROM debug_context;"

# Verify triggers
supabase sql --db-url="$SUPABASE_DB_URL" --query="SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%debug%';"
```

## 🎉 Success Metrics

### Setup Success
- ✅ Database migrations applied
- ✅ Debug tools respond to queries
- ✅ Mobile app logs to debug_context
- ✅ Triggers capture database events

### Debugging Success
- ✅ AI identifies error patterns
- ✅ Suggestions lead to fixes
- ✅ Debug time reduced from hours to minutes
- ✅ Issues resolved with simple commands

## 📞 Support

### Getting Help
1. **Check this README** for common solutions
2. **Run setup again**: `npm run setup`
3. **Test with simple query**: `node supabase-debug.js "test"`
4. **Check debug-report.json** for detailed analysis

### Contributing
- Add new feature debuggers in `feature-debuggers/`
- Enhance pattern detection in `supabase-debug.js`
- Improve AI suggestions based on common issues
- Update documentation with new examples

---

**Ready to debug?** Run `npm run setup` and start using AI-assisted debugging with simple commands!
