# Chrome Extension Project Structure

This document outlines the structure and organization of the AI Character Builder Chrome Extension project.

## Project Overview
- **Name**: AI Character Builder
- **Type**: Chrome Extension (Manifest V3)
- **Tech Stack**: TypeScript, Webpack
- **Version**: 1.0.0

## Directory Structure

```
├── public/                 # Static assets and manifest
│   ├── images/            # Extension icons
│   └── manifest.json      # Chrome extension manifest file
│
├── src/                   # Source code
│   ├── background/        # Background service worker
│   ├── content/          # Content scripts injected into web pages
│   ├── popup/            # Extension popup UI
│   ├── services/         # Service layer (AI services)
│   ├── twitter/          # Twitter-specific functionality
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
│
├── scripts/              # Build and utility scripts
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── webpack.config.js     # Webpack build configuration
```

## Key Components

1. **Background Service Worker** (`src/background/`)
   - Handles extension's background processes
   - Runs as a service worker (Manifest V3 requirement)

2. **Content Scripts** (`src/content/`)
   - Injected into web pages
   - Interacts with web page content
   - Specifically targets Twitter/X.com domains

3. **Popup Interface** (`src/popup/`)
   - `index.html` - Main popup interface
   - `options.html` - Extension settings page
   - Associated TypeScript files for functionality

4. **Twitter Integration** (`src/twitter/`)
   - Specialized handling for Twitter/X.com
   - Timeline and post processing
   - Common Twitter utilities

5. **Services** (`src/services/`)
   - AI-related services and integrations

## Build System

- Uses Webpack for bundling
- TypeScript compilation via ts-loader
- Development and production build configurations
- Watch mode available for development

## Scripts

- `npm run dev` - Development build with watch mode
- `npm run build` - Standard build
- `npm run watch` - Build with watch mode
- `npm run prod` - Production build

## Permissions

The extension requires:
- Storage access
- Active tab access
- Scripting permissions
- Host permissions for:
  - Twitter/X.com domains
  - Local development servers

## Browser Support

Chrome/Chromium-based browsers supporting Manifest V3
