# MIDI to MPC Pattern Converter

A web-based application that converts MIDI files to MPC pattern format (.mpcpattern) for Akai Force and other Akai products. This project has been unminified and restructured from the original at [https://www.fentonia.com/catnip/midianmpc/index.html](https://www.fentonia.com/catnip/midianmpc/index.html) into a modular, maintainable codebase.

## Features

- **MIDI File Support**: Load and parse standard MIDI files (.mid, .midi)
- **Visual Timeline**: Interactive graphical display of MIDI tracks with note visualization
- **Time Selection**: Click and drag to select specific time ranges for conversion
- **Multi-Track Support**: Convert individual tracks or entire MIDI files
- **MPC Pattern Export**: Generate .mpcpattern files compatible with Akai devices
- **Real-time Preview**: See notes, velocities, and timing information
- **Drag & Drop**: Easy file loading with drag and drop support

## Project Structure

```
src/
├── components/           # React components
│   ├── app.js           # Main application component
│   ├── file-widget.js   # File input and drag & drop handling
│   ├── midi-visualizer.js  # MIDI track visualization
│   └── track-component.js   # Individual track display and controls
├── converter/           # MPC conversion logic
│   └── mpc-converter.js # MIDI to MPC pattern conversion
├── midi/               # MIDI processing utilities
│   ├── midi-utils.js   # Core MIDI classes and utilities
│   ├── midi-parser.js  # MIDI file parsing
│   └── midi-writer.js  # MIDI file writing
├── styles/             # CSS styles
│   └── components.css  # Component styles
├── utils/              # Utility functions
│   └── webpack-runtime.js  # Webpack module system
└── main.js             # Application entry point
```

## Installation

1. Clone or download the project files
2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

This will start a webpack dev server at `http://localhost:3000` with hot reloading enabled.

## Building for Production

Create a production build:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage

1. **Load a MIDI File**: 
   - Click "Choose MIDI File" or drag and drop a .mid/.midi file
   - The file is processed entirely in your browser - no data is sent to external servers

2. **View Tracks**: 
   - Each MIDI track is displayed with a visual timeline
   - Notes are shown as horizontal bars with color indicating velocity
   - Track information includes note count, pitch range, and duration

3. **Select Time Range** (Optional):
   - Click and drag on the timeline to select a specific portion
   - Only the selected range will be converted to MPC format

4. **Convert to MPC**:
   - Click the "+ MPC Pattern" button for any track
   - A .mpcpattern file will be downloaded automatically

## Supported Features

### MIDI Features
- Standard MIDI file formats (Type 0, 1, 2)
- Note On/Note Off events
- Multiple tracks and channels
- Velocity information
- Timing and duration data

### MPC Pattern Features
- Note events with timing and velocity
- 960 PPQ (Pulses Per Quarter) resolution
- Compatible with Akai Force, MPC Live, MPC X, and other Akai devices
- Preserves note timing and velocity information

## Technical Details

### Architecture
- **Modular Design**: Separated into logical modules for maintainability
- **React Components**: Modern React-based UI components
- **ES6+ JavaScript**: Uses modern JavaScript features and modules
- **Webpack Build**: Configured for both development and production builds

### MIDI Processing
- **Binary Parsing**: Direct parsing of MIDI binary data
- **Time Conversion**: Converts MIDI ticks to MPC time units
- **Multi-track Support**: Handles complex MIDI arrangements

### Browser Compatibility
- Modern browsers with ES6+ support
- File API support for local file processing
- Canvas API for timeline visualization

## File Format Details

### Input: MIDI Files (.mid, .midi)
- Standard MIDI File Format 0, 1, or 2
- Multi-track support
- Various time divisions supported

### Output: MPC Pattern Files (.mpcpattern)
- JSON format compatible with Akai devices
- 960 PPQ resolution
- Note events with timing, pitch, velocity, and duration

## Limitations

- Only Note On/Note Off events are converted
- Other MIDI events (controllers, program changes, etc.) are not included in MPC patterns
- Time selection is currently track-specific
- Maximum file size limited by browser memory

## Contributing

To contribute to this project:

1. Follow the existing code structure and naming conventions
2. Add appropriate documentation for new features
3. Test with various MIDI files
4. Ensure compatibility with existing MPC devices

## License

The original project doesnt have a specified license. But the original credit goes to Jamie Fenton aka [Fentonia](https://www.fentonia.com) for the initial implementation. This restructured version is provided as-is without any warranty.