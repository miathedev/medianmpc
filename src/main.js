/**
 * Main Entry Point
 * Initializes the MIDI to MPC converter application
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import jQuery from 'jquery';
window.$ = window.jQuery = jQuery;

// Import application components
import { MidiConverterApp, WidgetManager } from './components/app.js';
import { FileWidget } from './components/file-widget.js';
import { MidiDocument } from './midi/midi-utils.js';
import { MPCConverter } from './converter/mpc-converter.js';

// Import styles
import './styles/components.css';

// Global variables for backward compatibility
let globalWidget = null;
let isApplicationReady = false;

/**
 * Initialize the application when the page loads
 */
function initializeApplication() {
    console.log('Initializing MIDI to MPC Converter...');
    
    try {
        // Create main widget instance
        const widget = new WidgetManager('midiview');
        globalWidget = widget;
        
        // Set up file input handlers
        setupFileHandlers(widget);
        
        // Render React application
        const appContainer = document.getElementById('root');
        if (appContainer) {
            const root = createRoot(appContainer);
            root.render(
                React.createElement(MidiConverterApp)
            );
        }
        
        // Bind GUI elements
        widget.bindGui();
        
        isApplicationReady = true;
        console.log('Application initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Failed to initialize application: ' + error.message);
    }
}

/**
 * Set up file input event handlers
 */
function setupFileHandlers(widget) {
    // File input change handler
    const fileInput = document.getElementById('opener');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            widget.openLocal(event);
        });
    }
    
    // Open MIDI file dialog handler
    jQuery('.openmidibutn').click((event) => {
        openMidiFileDialog(event);
    });
}

/**
 * Open MIDI file dialog
 */
function openMidiFileDialog(event) {
    event.preventDefault();
    const fileInput = document.getElementById('opener');
    if (fileInput) {
        fileInput.click();
    }
}

/**
 * Handle file loading with legacy support
 */
function handleFileLoad(file) {
    if (!globalWidget) {
        console.error('Application not initialized');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const arrayBuffer = event.target.result;
            
            // Parse MIDI file
            const midiDocument = MidiDocument.fromBuffer(arrayBuffer);
            console.log(`Loaded MIDI file with ${midiDocument.tracks.length} tracks`);
            
            // Create converter
            const converter = new MPCConverter(midiDocument);
            converter.calcTimeBounds();
            
            // Update widget
            globalWidget.setEditData(arrayBuffer);
            
            // Trigger re-render of React app with new data
            const appContainer = document.getElementById('root');
            if (appContainer) {
                const root = createRoot(appContainer);
                root.render(
                    React.createElement(MidiConverterApp, {
                        initialMidiDocument: midiDocument,
                        initialMidiText: file.name,
                        initialConverter: converter
                    })
                );
            }
            
        } catch (error) {
            console.error('Error processing MIDI file:', error);
            showError('Error processing MIDI file: ' + error.message);
        }
    };
    
    reader.onerror = function() {
        showError('Error reading file: ' + file.name);
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * Show error message to user
 */
function showError(message) {
    // Create error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 10000);
}

/**
 * Legacy compatibility functions
 */
function registerCompatibilityLayer() {
    // Global error handler
    window.onerror = function(msg, url, line, col, error) {
        const extra = !col ? '' : '\ncolumn: ' + col;
        const errorInfo = !error ? '' : '\nerror: ' + error;
        const errorMessage = "Error: " + msg + "\nurl: " + url + "\nline: " + line + extra + errorInfo;
        
        console.error(errorMessage);
        showError(errorMessage);
        
        return true;
    };
    
    // Expose global functions for backward compatibility
    window.openMidiFileDialog = openMidiFileDialog;
    window.handleFileLoad = handleFileLoad;
    window.showError = showError;
}

/**
 * DOM ready handler
 */
function onDocumentReady() {
    console.log('DOM ready, initializing application...');
    
    // Register compatibility layer
    registerCompatibilityLayer();
    
    // Initialize application
    initializeApplication();
}

/**
 * Window load handler
 */
function onWindowLoad() {
    console.log('Window loaded');
    
    if (!isApplicationReady) {
        onDocumentReady();
    }
}

// Set up event listeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDocumentReady);
} else {
    onDocumentReady();
}

window.addEventListener('load', onWindowLoad);

// Export for module systems
export {
    initializeApplication,
    openMidiFileDialog,
    handleFileLoad,
    WidgetManager,
    MidiConverterApp,
    FileWidget,
    MidiDocument,
    MPCConverter
};