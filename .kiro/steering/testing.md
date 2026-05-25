# Testing

## Live Server

The project runs on a local dev server at:

```
http://localhost:5500
```

Use this URL when testing with the Chrome DevTools MCP server. The page auto-reloads on file changes.

## Browser testing workflow

1. Navigate to `http://localhost:5500`
2. Check for console errors after page load — a game stage is created automatically on load (no need to click "New")
3. Click the deck (top-left, black card back) to draw a card
4. Verify the card appears in the hand at the bottom

## Quick smoke test via script

To draw a card programmatically (game stage already exists on load):

```js
const el = document.elementFromPoint(67, 113);
el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 67, clientY: 113 }));
el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 67, clientY: 113 }));
```
