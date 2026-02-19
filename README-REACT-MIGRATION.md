# React Migration Guide

This project has been migrated from vanilla JavaScript to React. Here's what changed and how to work with it.

## What Changed

### Build System
- **Before**: No build system (direct HTML/JS files)
- **After**: Vite + React build system
- Build output goes to `dist/` directory

### File Structure
- `src/sidebar/sidebar.js` → `src/sidebar/sidebar.jsx` (React component)
- `src/options/options.js` → `src/options/options.jsx` (React component)
- HTML files now use React root (`<div id="root"></div>`)
- CSS files remain the same (imported in React components)

### Dependencies
- Added: `react`, `react-dom`
- Added: `@vitejs/plugin-react`, `vite` (dev dependencies)
- Added: TypeScript types for React

## Development

### Install Dependencies
```bash
npm install
```

### Development Mode
```bash
npm run dev
```
This runs Vite in watch mode, rebuilding on file changes.

### Build for Production
```bash
npm run build
```
This creates a production build in the `dist/` directory ready for Chrome extension packaging.

## Loading the Extension

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` directory

## Key React Patterns Used

### State Management
- Uses React `useState` hooks for component state
- State is lifted to parent components where needed
- No external state management library (Redux/Zustand) - kept simple

### Component Structure
- Main `SidebarApp` component manages global state
- Smaller functional components for UI sections (Header, ContextBar, etc.)
- Modal components are conditionally rendered based on `activeModal` state

### Chrome Extension APIs
- Chrome APIs (`chrome.storage`, `chrome.runtime`, `chrome.tabs`) work the same way
- Message listeners are set up in `useEffect` with proper cleanup
- No changes needed to background scripts or content scripts

## Migration Notes

### What Stayed the Same
- Background service worker (`src/background/service-worker.js`)
- Content script (`src/content/content-script.js`)
- Core services and modules
- CSS styling (no changes to CSS files)
- Chrome extension manifest structure

### What Changed
- All UI logic is now in React components
- Event handlers are React event handlers (`onClick`, `onChange`, etc.)
- DOM manipulation replaced with React state and rendering
- Modal management uses React state instead of manual show/hide

## Troubleshooting

### Build Errors
- Make sure all dependencies are installed: `npm install`
- Check that Node.js version is 16+ (required for Vite)

### Extension Not Loading
- Ensure `dist/` directory exists and contains all files
- Check browser console for errors
- Verify manifest.json paths are correct

### React Errors
- Check browser console for React-specific errors
- Ensure all imports are correct
- Verify React components are properly exported

## Next Steps

Consider these improvements:
- Add TypeScript for better type safety
- Extract more reusable components
- Add React Context for shared state if needed
- Consider React Router if adding more pages
- Add unit tests with React Testing Library
