# Manual Application Tracking Feature

## Overview
Added the ability for users to manually add and track applications from any source (not just internships found on the platform).

## Changes Made

### 1. Database Migration
**File:** `backend/src/database/migrations/013_make_internship_id_nullable.sql`

- Made `internship_id` nullable in `user_applications` table
- Added new columns for manual entries:
  - `manual_company_name` - Company name for manual entries
  - `manual_position_title` - Position title for manual entries
  - `manual_location` - Location for manual entries
  - `manual_application_url` - Application URL for manual entries
  - `manual_deadline` - Application deadline for manual entries
  - `is_manual_entry` - Boolean flag to distinguish manual vs platform entries
- Updated constraints to ensure data integrity
- Created partial unique index for platform internships only

### 2. Backend Type Updates
**File:** `backend/src/types/internship.types.ts`

- Updated `UserApplication` interface to include manual entry fields
- Updated `UserApplicationCreateInput` to support both platform and manual entries
- Updated `UserApplicationUpdateInput` to allow editing manual entry fields
- Made `internship` optional in `UserApplicationWithInternship`
- Added `ApplicationsResponse` and `ApplicationInsights` interfaces

### 3. Backend Model Updates
**File:** `backend/src/models/UserApplication.ts`

- Updated `create()` method to handle both manual and platform entries
- Modified `findByUserIdWithInternships()` to use LEFT JOIN (includes manual entries)
- Updated `findUpcomingReminders()` to handle manual entries
- Updated `getStatsByUserId()` to include manual deadlines in statistics
- All queries now properly handle both entry types

### 4. Frontend Components

#### New Component: AddApplicationForm
**File:** `frontend/src/components/applications/AddApplicationForm.tsx`

A comprehensive form dialog for adding manual applications with fields:
- Company Name (required)
- Position Title (required)
- Location (optional)
- Application Status
- Application URL (optional)
- Application Deadline (optional)
- Reminder Date (optional)
- Notes (optional)

Features:
- Form validation
- Date pickers for deadlines and reminders
- Clean, user-friendly Material-UI design
- Proper error handling

#### Updated Component: ApplicationsDashboard
**File:** `frontend/src/components/applications/ApplicationsDashboard.tsx`

- Added "Add Application" button in the header
- Integrated `AddApplicationForm` dialog
- Added mutation for creating manual applications
- Proper state management and query invalidation

#### Updated Component: ApplicationCard
**File:** `frontend/src/components/applications/ApplicationCard.tsx`

- Updated to display both platform and manual applications
- Shows "Manual" badge for manually entered applications
- Dynamically displays data from either internship or manual fields
- Handles missing internship data gracefully
- Shows deadline information for manual entries

### 5. Frontend Type Updates
**File:** `frontend/src/types/internship.types.ts`

- Mirrored backend type changes
- Added manual entry fields to `UserApplication`
- Updated create and update input interfaces
- Made `internship` optional in `UserApplicationWithInternship`

## How to Use

### For Users:

1. **Add Manual Application:**
   - Go to Application Tracker page
   - Click "Add Application" button
   - Fill in the form with application details
   - Click "Add Application" to save

2. **View Applications:**
   - Manual applications show a "Manual" badge
   - All application data is displayed consistently
   - Can filter, search, and manage just like platform applications

3. **Update Applications:**
   - Click the menu icon (three dots) on any application card
   - Select "Edit" to update status, notes, or reminder
   - Manual entry fields can be updated through the edit dialog

### For Developers:

1. **Run Migration:**
   ```bash
   npm run migrate
   ```

2. **Backend automatically handles:**
   - Distinguishing between manual and platform entries
   - Proper validation (either internship_id OR manual fields required)
   - Query optimization with appropriate JOINs

3. **Frontend automatically:**
   - Displays correct data based on entry type
   - Validates required fields for manual entries
   - Handles optional internship data

## Benefits

1. **Flexibility:** Users can track applications from any source (LinkedIn, company websites, referrals, etc.)
2. **Completeness:** Get a complete view of all applications in one place
3. **Consistency:** Manual and platform applications are managed identically
4. **Data Integrity:** Database constraints ensure valid data
5. **User Experience:** Clean, intuitive interface for adding applications

## Technical Notes

- Manual entries have `is_manual_entry = true` and `internship_id = null`
- Platform entries have `is_manual_entry = false` and valid `internship_id`
- Database constraint ensures one or the other is always valid
- LEFT JOIN used in queries to include both types
- Frontend gracefully handles missing internship data
- All existing functionality remains backward compatible

## Future Enhancements

Potential improvements:
- Bulk import from CSV/Excel
- Integration with email to auto-detect applications
- AI-powered application tracking from screenshots
- Calendar integration for interview reminders
- Analytics on application success rates by source
