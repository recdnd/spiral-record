# Shandira Design System

## Overview

Shandira is a unified design language for Spiral platform UI components, emphasizing clean aesthetics, intuitive interactions, and consistent visual hierarchy. Named after the elegant module selection interface pattern.

## Core Visual Principles

### Color Palette
- **Primary Orange-Red**: `#ff4221` (Spiral brand color)
- **Selected/Active State**: Orange-red background with white text
- **Inactive/Default State**: Very light gray background `#f8f9fa` with dark gray text
- **Hover State**: Instant transition to orange-red
- **Text Contrast**: White text on orange-red, dark gray text on light backgrounds

### Typography
- **Primary Font**: System font stack with Chinese support
- **Module Glyphs**: Larger symbolic representations (✞, ★, 𖡎, etc.)
- **UI Text**: Clean, readable hierarchy

### Component Design

#### Module Selection Interface
Based on the reference screenshot showing:
- Elegant card-based layout with subtle borders
- Clean typography with glyph + name + description format
- Responsive hover states
- Proper spacing and visual hierarchy

#### Button System
- **Base State**: Light gray `bg-gray-100` with dark text
- **Hover**: Instant orange-red transition
- **Active/Selected**: Orange-red background, white text
- **Exit Hover**: Smooth fade-back transition (300ms)
- **Size**: Slightly enlarged (w-9 h-9 vs w-8 h-8) for better touch targets

#### Interactive Elements
- **Instant Hover Entry**: No delay on hover activation
- **Smooth Exit**: 300ms transition when leaving hover state
- **Clear Visual Feedback**: Distinct states for all interactive elements
- **Accessibility**: High contrast ratios, clear focus indicators

### Layout Principles

#### Content Positioning
- Function buttons (edit, add, remove, copy) positioned at rightmost edge of content containers
- Proper z-index hierarchy for overlays and popups
- Consistent spacing and alignment across all components

#### Modal and Popup Design
- Clean shadcn/ui based components
- Proper backdrop handling
- Elegant entry/exit animations
- Focus management for accessibility

## Implementation Guidelines

### CSS Classes
```css
.hover-instant { transition: none; }
.hover-instant:hover { /* immediate state change */ }
.transition-smooth { transition: all 300ms ease-out; }
```

### Component Patterns
- Use shadcn/ui as base component library
- Implement shandira color overrides consistently
- Maintain responsive design principles
- Ensure touch-friendly sizing on mobile devices

## Usage Context

The shandira design system is specifically implemented in:
- Module selection interfaces (主頁左上方彈窗模組選項欄)
- Login/authentication flows (模組同步中心)
- Button interactions across the platform
- Popup and modal components
- Fragment Editor function buttons (🖊️、+、-、複製)

### Button Design Standards
- **Selected State**: Orange-red background (`#ff4221`) with white text/icons
- **Default State**: Light gray background (`#f8f9fa`) with dark gray text/icons  
- **Hover**: Instant transition to orange-red, smooth fade-back on exit (300ms)
- **Text/Icon Contrast**: White on orange-red, dark gray on light backgrounds

### WRAPPED_DOCUMENT System
- Automatic daily generation of wrapped fragments
- Orange overlay (`rgba(251, 146, 60, 0.8)`) with ░WRAPPED░ text
- 1 suscoin cost for unwrapping premium content
- Mock data includes multiple wrapped document types for testing

This design language ensures consistent user experience across all Spiral platform interfaces while maintaining the unique aesthetic identity of the brand.