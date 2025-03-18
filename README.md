# BUZZ Reply Helper Chrome Extension

A Chrome extension to help with replying to BUZZ posts on Edge Posting.

## Features

- Extract buzz cards from Edge Posting using AI
- Auto-reply to tweets with a single click
- Automatically submit reply URLs
- Automatically close Twitter tabs after replying

## Development

This project is built with TypeScript, React, and webpack.

### Prerequisites

- Node.js (v14 or later)
- pnpm (v6 or later)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

### Development

To build the extension in development mode with watch mode:

```bash
pnpm run dev
```

### Production Build

To build the extension for production:

```bash
pnpm run prod
```

### Creating a ZIP File

To create a ZIP file for distribution:

```bash
pnpm run zip
```

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the `dist` directory

## Project Structure

- `src/`: Source code
  - `background/`: Background script
  - `content/`: Content scripts
    - `twitter/`: Twitter-specific content script
    - `edge-posting/`: Edge Posting-specific content script
  - `popup/`: Popup UI components
  - `lib/`: Shared libraries
  - `types/`: TypeScript type definitions
- `public/`: Static assets
  - `manifest.json`: Extension manifest
  - `images/`: Icons and images
- `dist/`: Compiled output (generated)
- `scripts/`: Build scripts

## License

MIT 