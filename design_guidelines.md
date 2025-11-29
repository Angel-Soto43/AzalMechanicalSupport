# Design Guidelines: Azal Mechanical Supports Cloud File Manager

## Design Approach
**Design System**: Material Design principles with enterprise refinements, drawing inspiration from Google Drive's file management patterns and Linear's clean professional aesthetic for the administrative interface.

**Core Principle**: Trust-through-clarity - Every element communicates security, control, and professional reliability. This is an enterprise tool where clarity and efficiency trump visual flair.

---

## Typography System

**Primary Font**: Inter (Google Fonts)
**Secondary Font**: Roboto Mono (for file IDs, metadata)

**Hierarchy**:
- Page Titles: 32px, font-weight 700
- Section Headers: 24px, font-weight 600
- Card Titles/Labels: 16px, font-weight 500
- Body Text: 14px, font-weight 400
- Metadata/Timestamps: 12px, font-weight 400, Roboto Mono

---

## Layout System

**Spacing Scale**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-6
- Section spacing: mb-8 or mb-12
- Tight spacing: gap-2 or gap-4
- Generous spacing: gap-8

**Container Strategy**:
- Dashboard views: max-w-7xl with px-6
- Form modals: max-w-2xl
- File preview panels: max-w-4xl

---

## Core Layouts

### 1. Authentication Page
Full-viewport centered layout with company branding:
- **Left Panel** (50% width, hidden on mobile): Company logo, tagline "Secure Document Management for Industrial Supply", abstract geometric background pattern suggesting security/structure
- **Right Panel**: Centered login form with clear "Azal Mechanical Supports" header, username/password inputs with icons, "Sign In" button, security badge indicators (ISO 27001 certified)

### 2. Main Dashboard Layout
Two-tier navigation system:

**Top Bar** (fixed, h-16):
- Company logo left
- Search bar center (grows to max-w-2xl)
- User menu right (avatar, name, logout)

**Sidebar** (w-64, collapsible to icons on mobile):
- Dashboard (home icon)
- My Files (folder icon)
- All Files (grid icon, admin only)
- Users Management (users icon, admin only)
- Audit Logs (clipboard icon, admin only)
- Settings (gear icon)

**Main Content Area**: pl-64 (compensate sidebar), pt-16 (compensate top bar), p-8

### 3. File Management Views

**Files Grid Layout**:
- Cards in grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Each file card displays: large file type icon, filename (truncated), contract ID badge, upload date, uploader name, file size, action menu (3-dot)
- Hover state: subtle elevation increase, action buttons appear

**Files Table Layout** (admin view):
- Comprehensive table: checkbox, file icon, filename, contract ID, uploader, date/time, size, type, actions
- Sticky header, alternating row backgrounds, sortable columns
- Pagination controls at bottom

---

## Component Library

### Navigation & Controls
- **Primary Buttons**: Full corners (rounded-lg), medium size (px-6 py-3), hover with slight scale
- **Secondary Buttons**: Outlined style, same sizing
- **Icon Buttons**: Square (w-10 h-10), rounded-md, ghost style
- **Tabs**: Underline style with indicator bar
- **Breadcrumbs**: With chevron separators, last item bold

### File Upload Zone
Dashed border rectangle, centered drop icon and "Drag & drop files or click to browse" text, file type indicators below, contract ID input prominently displayed above upload area

### File Cards
- **Aspect ratio**: Square preview area with file icon
- **Content**: Contract ID as badge (top-right), filename, metadata row (date, size), uploader avatar + name
- **Actions**: Download, preview, version history icons (visible on hover)

### Search & Filters
- **Search Bar**: Full-width input with search icon left, filter icon right, autocomplete dropdown
- **Filter Panel**: Slide-out from right, organized sections (Date Range, File Type, Uploader, Contract ID), apply/reset buttons at bottom

### Admin Panel Elements
- **User Management Cards**: Avatar, name, role badge, status indicator (active/inactive), edit/deactivate buttons
- **Audit Log Entries**: Timeline style with icons, timestamp, user, action description, affected file link
- **Statistics Cards**: Grid of 4 cards showing total files, storage used, active users, recent uploads (large number display, small label, trend indicator)

### Modals & Overlays
- **Standard Modal**: Centered, max-w-2xl, header with title + close button, content area with p-6, footer with action buttons
- **File Preview**: Larger modal (max-w-4xl), embedded viewer for PDFs/images, metadata sidebar (right), download button prominent
- **Confirmation Dialogs**: Smaller (max-w-md), warning icon for destructive actions

### Forms
- **Input Fields**: Full-width, h-12, rounded-md border, label above, helper text/error below, icon prefix where appropriate
- **Select Dropdowns**: Match input styling, chevron indicator
- **File Input**: Custom styled with button and selected file display
- **Form Groups**: Organized with mb-6 spacing

### Data Display
- **Tables**: Minimal borders, hover row highlighting, fixed header, right-aligned numeric columns
- **Badges**: Small pills for status (active/inactive), file types, contract IDs - use rounded-full, px-3 py-1, uppercase text
- **Metadata Lists**: Label-value pairs, label in muted weight, value in normal weight, mb-4 spacing

---

## Responsive Behavior

**Mobile (< 768px)**:
- Sidebar collapses to hamburger menu overlay
- File grid switches to single column list view
- Table becomes stacked cards
- Search moves to full-width below header
- Modals use full-screen on very small devices

**Tablet (768px - 1024px)**:
- 2-column file grid
- Sidebar remains visible but narrower
- Table with horizontal scroll if needed

**Desktop (> 1024px)**:
- Full layout as designed
- 3-4 column file grids
- Split views for file preview

---

## Images & Visual Elements

**Hero/Landing Elements**: None - this is a secure enterprise application that loads directly to authentication or dashboard

**Icons**: Use Heroicons throughout via CDN (outline style for navigation, solid for status indicators)

**File Type Icons**: Large, recognizable icons for common types (PDF, Word, Excel, ZIP, etc.) - use Font Awesome document icons

**Empty States**: Centered illustration placeholders with helpful text ("No files yet - upload your first document", "No users found", etc.)

**Loading States**: Skeleton screens matching card/table layouts, subtle pulse animation

---

## Security & Trust Indicators

- ISO/IEC certification badges in footer
- Padlock icon in top bar indicating secure connection
- "Last login" timestamp displayed in user menu
- Session timeout countdown (visible 5 minutes before expiry)
- Audit trail breadcrumbs showing "All actions are logged"

---

This design prioritizes clarity, security perception, and efficient workflows for both administrators and regular users while maintaining professional enterprise aesthetics.