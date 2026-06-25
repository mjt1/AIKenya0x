---
name: AgriLink Unified
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#424942'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#727971'
  outline-variant: '#c1c8bf'
  surface-tint: '#40674a'
  primary: '#001707'
  on-primary: '#ffffff'
  primary-container: '#052e16'
  on-primary-container: '#6f9877'
  inverse-primary: '#a6d1ad'
  secondary: '#1f6c3a'
  on-secondary: '#ffffff'
  secondary-container: '#a4f1b2'
  on-secondary-container: '#24703e'
  tertiary: '#0a1510'
  on-tertiary: '#ffffff'
  tertiary-container: '#1f2a24'
  on-tertiary-container: '#85918a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c1edc8'
  primary-fixed-dim: '#a6d1ad'
  on-primary-fixed: '#00210d'
  on-primary-fixed-variant: '#284f33'
  secondary-fixed: '#a6f4b5'
  secondary-fixed-dim: '#8bd79b'
  on-secondary-fixed: '#00210b'
  on-secondary-fixed-variant: '#005226'
  tertiary-fixed: '#d9e6dd'
  tertiary-fixed-dim: '#bdcac1'
  on-tertiary-fixed: '#131e19'
  on-tertiary-fixed-variant: '#3e4943'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 1.5rem
  gutter: 1rem
  card-padding: 1.25rem
  stack-sm: 0.5rem
  stack-md: 1rem
---

## Brand & Style

This design system is built to bridge the gap between rural agricultural production and urban market dynamics. The brand personality is **dependable, growth-oriented, and systematic**. It leverages a **Modern Corporate** aesthetic with subtle **Tactile** influences to ensure the interface feels grounded and accessible to users ranging from smallholder farmers to large-scale produce buyers.

The visual language emphasizes clarity and trust through:
- **High-Density Utility:** Maximizing information display for dashboards and market data without overwhelming the user.
- **Organic Professionalism:** Using a deep forest green to represent growth and agriculture, paired with high-contrast functional colors for immediate status recognition.
- **Structural Integrity:** A rigorous grid system that maintains alignment across complex data tables and multi-card layouts.

## Colors

The palette is anchored by "Forest Depth" (Primary), providing a stable, high-contrast base for navigation and branding. 

- **Primary & Secondary:** Used for sidebar backgrounds, primary actions, and brand identification.
- **Surface & Background:** A combination of pure white (#FFFFFF) for primary cards and a very light cool gray (#F8FAFC) for the application background to create subtle layered depth.
- **Semantic Accents:** A strict color-coding system for statuses:
    - **Green:** Active orders, premium quality, price increases.
    - **Amber:** Pending actions, mid-tier quality, warnings.
    - **Red:** Cancellations, price drops, or urgent alerts.
- **Data Visualization:** A vibrant multi-color set (Blue, Orange, Red, Green) is reserved specifically for line charts and regional heatmaps.

## Typography

The system utilizes **Inter** exclusively to maintain a clean, highly legible, and utilitarian feel across data-heavy interfaces.

- **Weight Strategy:** Bold and Semi-Bold weights are used for headers and key data points (e.g., currency values) to ensure they pop against the white surfaces.
- **Information Hierarchy:** Smaller font sizes (11px-12px) are used frequently for metadata, table headers, and secondary labels to accommodate the high density of dashboard content.
- **Mobile Optimization:** On mobile, `display-lg` scales down to 24px to prevent awkward text wrapping, while body text maintains a minimum of 14px for tap targets and readability.

## Layout & Spacing

The system employs a **Fluid Grid** model optimized for high-density information display.

- **Grid Structure:** A 12-column grid for desktop, collapsing to 4 columns for mobile. 
- **The "Dashboard Gap":** A consistent 1rem (16px) gutter is used between all dashboard cards to maintain clear separation while maximizing screen real estate.
- **Mobile Reflow:** Cards that appear side-by-side on desktop (e.g., Stats widgets) must stack vertically on mobile or be placed within a horizontally scrollable container to preserve data integrity.
- **Visual Rhythm:** Spacing is strictly based on a 4px baseline, with 8px and 16px being the most common increments for internal component padding.

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows, keeping the UI feeling "light" and modern.

- **Level 0 (Background):** Light gray (#F8FAFC) surface.
- **Level 1 (Cards):** Pure white (#FFFFFF) with a thin 1px border (#E2E8F0). No shadow is used for static cards.
- **Level 2 (Interactive):** Elements like dropdowns or hovered buttons use a soft, ambient shadow (0px 4px 6px rgba(0,0,0,0.05)) to indicate interactivity.
- **Sidebar Depth:** The primary navigation sidebar uses the "Forest Depth" green, providing a strong vertical anchor that feels recessed compared to the bright content cards.

## Shapes

The shape language is **Rounded**, striking a balance between friendly approachability and professional structure.

- **Container Corners:** Standard dashboard cards and input fields use a 0.5rem (8px) radius.
- **Interactive Elements:** Buttons and active navigation states use a slightly more pronounced radius or full pill-shapes for "Buy Now" actions to increase their affordance.
- **Status Chips:** Small badges use a 4px radius or fully rounded ends to distinguish them from functional buttons.

## Components

### Buttons
- **Primary:** Solid "Forest Depth" green with white text.
- **Secondary:** White background with a "Forest Depth" border and text.
- **Action (Market):** High-contrast "Success Green" for "Buy Now" to drive conversion.

### Cards (The "Widget" Pattern)
- **Stats Card:** Features a small icon with a tinted background (e.g., light blue background for a blue icon), a bold primary value, and a small footer for secondary metrics.
- **Data Table Card:** White surface, light gray header row, and subtle 1px horizontal dividers.

### Status Indicators (Chips)
- **Text-only badges:** Used in tables for "Premium", "Good", "Active". Backgrounds are 10% opacity versions of the status color with 100% opacity text.

### Inputs
- **Search Bar:** Large, centered in the header, with a subtle border and a lead-in search icon.
- **Filters:** Pill-shaped toggle chips for categories (e.g., "Maize", "Beans", "Tomatoes").

### Navigation
- **Sidebar:** Dark theme with icons on the left, clear active states indicated by a lighter green background or a vertical stripe on the left edge.