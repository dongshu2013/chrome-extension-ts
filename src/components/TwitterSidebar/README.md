# Twitter Sidebar Component

This directory contains the refactored Twitter sidebar components, which provide a modular approach to the Twitter Analyzer sidebar functionality.

## Component Structure

- **index.tsx**: Main sidebar component that combines all subcomponents
- **SidebarHeader.tsx**: Header component with title, close button, and tab navigation
- **ScraperTab.tsx**: Profile scraper tab component
- **PostDetailTab.tsx**: Post detail viewer tab component
- **SettingsTab.tsx**: Settings tab component
- **Notification.tsx**: Notification component for errors and success messages
- **sidebarManager.tsx**: Utility functions for injecting and managing the sidebar

## Utility Files

The sidebar components rely on these utility files:

- **src/utils/twitterUtils.ts**: Twitter-specific utility functions
- **src/utils/domUtils.ts**: DOM manipulation and scraping utility functions
- **src/types/sidebar.ts**: TypeScript types for the sidebar components

## Usage

To use the sidebar in your code:

```typescript
// Import the sidebar manager functions
import { 
  injectSidebar, 
  removeSidebar, 
  openSidebarWithTab
} from "../components/TwitterSidebar/sidebarManager"

// Open sidebar with default tab
injectSidebar(username)

// Open sidebar with specific tab
openSidebarWithTab("postDetail", username)

// Remove sidebar
removeSidebar()
```

## Component Lifecycle

1. The sidebar is injected into the DOM via the `injectSidebar` function
2. The TwitterSidebar component is rendered with specified props
3. The component manages state and renders the appropriate tab content
4. When closed, the sidebar is removed from the DOM via the `removeSidebar` function 