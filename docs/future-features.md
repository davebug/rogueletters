# Future Features

## Drag-and-Drop Interface

### Desktop Drag-and-Drop
- Native HTML5 drag-and-drop for seamless tile movement
- Visual feedback with cursor changes and hover states
- Smooth animations during drag operations
- Drop zones with visual indicators
- Support for keyboard modifiers (Shift for multi-select, etc.)

### Mobile Drag-and-Drop (Touch)
- Touch-based drag gestures for natural tile manipulation
- Long-press to initiate drag mode
- Visual feedback during drag with shadow/opacity effects
- Smooth follow-finger animations
- Haptic feedback on supported devices
- Pinch-to-zoom for better board visibility during placement

### Technical Implementation Notes
- Will use SortableJS or similar library for robust cross-platform support
- Implement proper touch event handling with preventDefault for scroll blocking
- Add insertion gaps that appear dynamically as tiles are dragged
- Support for both board-to-rack and rack-to-rack movements
- Implement proper z-index management during drag operations
- Add smooth transitions and animations for professional feel

### Benefits Over Current Tap-to-Select
- More intuitive and natural interaction model
- Faster tile placement for experienced players
- Better visual feedback during tile manipulation
- Reduced cognitive load (direct manipulation vs. two-step process)
- Industry-standard interaction pattern users expect