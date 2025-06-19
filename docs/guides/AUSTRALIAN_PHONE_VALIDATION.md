# Australian Phone Number Validation

## Overview

The system now defaults to Australian phone numbers (+61) when processing CSV uploads and validating individual phone numbers.

## How It Works

### CSV Upload

When uploading a CSV file with phone numbers:

1. **Numbers with country codes** (starting with +) are validated as-is
   - Example: `+61412345678` → `+61412345678`
   - Example: `+442012345678` → `+442012345678`

2. **Numbers without country codes** default to Australian (+61)
   - Example: `0412345678` → `+61412345678`
   - Example: `412345678` → `+61412345678`

3. **Leading zeros are automatically removed** for Australian numbers
   - The system recognizes that Australian mobile numbers often start with 0
   - This 0 is removed before adding +61

### Examples

| Input Number | Output Number | Notes |
|--------------|---------------|-------|
| +61412345678 | +61412345678 | Already has country code |
| 0412345678 | +61412345678 | Leading 0 removed, +61 added |
| 412345678 | +61412345678 | +61 added |
| +1234567890 | +1234567890 | Non-Australian number preserved |
| 0412 345 678 | +61412345678 | Spaces removed, 0 removed, +61 added |

## Implementation Details

### Backend Changes

File: `server-mongodb.js`
- Updated phone validation in CSV upload endpoint
- Changed default country from 'US' to 'AU'
- Added logic to handle numbers with/without country codes
- Automatically removes leading 0 for Australian numbers

### Frontend Changes

File: `frontend/src/lib/validation.ts`
- Updated `validatePhoneNumber` function
- Changed default country from 'US' to 'AU'
- Added logic to handle leading zeros

File: `frontend/src/components/upload-sheet-form.tsx`
- Updated help text to indicate Australian default

## Testing

To test the validation:

1. Create a CSV with mixed phone number formats:
   ```csv
   Name,Phone,Email
   John Doe,+61412345678,john@example.com
   Jane Smith,0423456789,jane@example.com
   Bob Wilson,434567890,bob@example.com
   ```

2. Upload the CSV with phone validation enabled

3. All numbers should be formatted to E.164 format with +61:
   - +61412345678
   - +61423456789
   - +61434567890

## Future Enhancements

- Add a country selector to allow users to choose default country
- Support for multiple countries in a single CSV
- Automatic country detection based on number patterns