/**
 * Main Application Component
 * Handles the complete MIDI to MPC conversion workflow
 */

import React, { Component } from 'react';
import { FileWidget } from './file-widget.js';
import { TrackComponent, MidiHeader } from './track-component.js';
import { MidiDocument } from '../midi/midi-utils.js';
import { MPCConverter } from '../converter/mpc-converter.js';
import { Midi } from '@tonejs/midi';

export class MidiConverterApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            midiDocument: null,
            midiText: '',
            converter: null,
            isLoading: false,
            error: null,
            toneMidi: null,
            midiArrayBuffer: null
        };

        this.fileWidgetRef = null;
    }

    componentDidMount() {
        // Initialize the application
        this.initializeApp();
    }

    initializeApp = () => {
        console.log('MIDI Converter App initialized');
    };

    handleFileSelect = (files) => {
        console.log(`Selected ${files.length} file(s)`);
        this.setState({ isLoading: true, error: null });
    };

    handleFileLoad = ({ file, data, name }) => {
        console.log(`Loading file: ${name}`);
        console.log(`File size: ${data.byteLength} bytes`);
        console.log(`Data preview:`, new Uint8Array(data.slice(0, 16)));

        try {
            // Parse MIDI file
            const midiDocument = MidiDocument.fromBuffer(data);
            console.log(`Parsed MIDI document:`, midiDocument);
            console.log(`Tracks found: ${midiDocument.tracks.length}`);

            // Parse with tone.js for playback (preserves tempo and channel data)
            const toneMidi = new Midi(data);
            console.log('Parsed Tone.js MIDI object:', toneMidi);

            // Prefer Tone.js tempo parsing if available (handles multiple tempo changes accurately)
            let detectedTempo = midiDocument?.header?.tempoBPM || null;
            if (toneMidi?.header) {
                if (Array.isArray(toneMidi.header.tempos) && toneMidi.header.tempos.length > 0) {
                    const earliestTempo = [...toneMidi.header.tempos].sort((a, b) => (a.ticks || 0) - (b.ticks || 0))[0];
                    if (earliestTempo?.bpm) {
                        detectedTempo = earliestTempo.bpm;
                    }
                } else if (toneMidi.header.bpm) {
                    detectedTempo = toneMidi.header.bpm;
                }
            }

            if (detectedTempo) {
                const tempoBPM = Number.parseFloat(detectedTempo) || 120;
                midiDocument.header = {
                    ...midiDocument.header,
                    tempoBPM
                };
                midiDocument.tempoBPM = tempoBPM;
            }

            // Log track details
            midiDocument.tracks.forEach((track, index) => {
                console.log(`Track ${index + 1}: ${track.notes?.length || 0} notes, name: "${track.name || 'Unknown'}"`);
            });

            // Create converter
            const converter = new MPCConverter(midiDocument);
            console.log(`Created converter:`, converter);

            // Update state
            this.setState({
                midiDocument,
                midiText: name,
                converter,
                midiArrayBuffer: data,
                toneMidi,
                isLoading: false,
                error: null
            });

            console.log(`Successfully loaded MIDI file with ${midiDocument.tracks.length} tracks`);

        } catch (error) {
            console.error('Error loading MIDI file:', error);
            console.error('Error stack:', error.stack);
            this.setState({
                error: `Error loading MIDI file: ${error.message}`,
                isLoading: false
            });
        }
    };

    handleFileError = (error) => {
        console.error('File error:', error);
        this.setState({
            error: error,
            isLoading: false
        });
    };

    handleFileProgress = (progress, file) => {
        console.log(`Loading progress: ${progress.toFixed(1)}% - ${file.name}`);
    };

    clearMidiData = () => {
        this.setState({
            midiDocument: null,
            midiText: '',
            converter: null,
            error: null,
            toneMidi: null,
            midiArrayBuffer: null
        });
    };

    renderTrackList = () => {
    const { midiDocument, converter, midiArrayBuffer, toneMidi } = this.state;

    if (!midiDocument || !midiDocument.tracks) {
        return null;
    }

    // Calculate time bounds
    if (converter) {
        converter.calcTimeBounds();
    }

    // Only show tracks with notes, but keep their original MIDI file index
    const tracksWithNotes = midiDocument.tracks
        .map((track, midiTrackIndex) => ({ track, midiTrackIndex }))
        .filter(({ track }) => track.notes && track.notes.length > 0);

    const toneTracksWithNotes = toneMidi
        ? toneMidi.tracks.filter(track => track.notes && track.notes.length > 0)
        : [];

    return (
        <div className="track-list">
            {tracksWithNotes.map(({ track, midiTrackIndex }, uiIndex) => {
                const toneTrack = toneTracksWithNotes[uiIndex] || null;
                if (!toneTrack) {
                    console.warn(`No Tone.js track found for MIDI track index ${midiTrackIndex}.`);
                }

                return (
                <TrackComponent
                    key={`track-${midiTrackIndex}`}
                    track={track}
                    trackNum={uiIndex + 1}
                    midiTrackIndex={midiTrackIndex}
                    song={midiDocument}
                    converter={converter}
                    midiArrayBuffer={midiArrayBuffer}
                    toneTrack={toneTrack}
                    toneMidi={toneMidi}
                />
                );
            })}
        </div>
    );
};

    renderStats = () => {
        const { midiDocument } = this.state;

        if (!midiDocument) return null;

        let totalNotes = 0;
        let totalTracks = midiDocument.tracks.length;
        let tracksWithNotes = 0;

        midiDocument.tracks.forEach(track => {
            if (track.notes && track.notes.length > 0) {
                totalNotes += track.notes.length;
                tracksWithNotes++;
            }
        });

        return (
            <div className="midi-stats">
                <div className="stats-row">
                    <span className="stat-item">Total Tracks: {totalTracks}</span>
                    <span className="stat-item">Tracks with Notes: {tracksWithNotes}</span>
                    <span className="stat-item">Total Notes: {totalNotes}</span>
                </div>
            </div>
        );
    };

    render() {
        const { midiDocument, midiText, isLoading, error } = this.state;

        return (
            <div className="midi-converter-app">
                <div className="app-header">
                    <h1>MIDI to MPC Pattern Converter</h1>
                    <p className="app-description">
                        Convert MIDI files to MPC pattern format for Akai Force and other Akai products.
                        Select a MIDI file, choose the tracks and time ranges you want to convert,
                        and download the resulting MPC pattern files.
                    </p>
                    <p className="app-credit" style={{ fontSize: '0.95em', color: '#888', marginTop: '10px' }}>
                        Based on the original by <a href="https://www.fentonia.com/catnip/midianmpc/index.html" target="_blank" rel="noopener noreferrer">Catnip/Jamie Faye Fenton (Fentonia)</a>.
                    </p>
                </div>

                <div className="file-section">
                    <FileWidget
                        acceptedTypes={['.mid', '.midi', '.MID', '.MIDI']}
                        onFileSelect={this.handleFileSelect}
                        onFileLoad={this.handleFileLoad}
                        onError={this.handleFileError}
                        onProgress={this.handleFileProgress}
                        dragAndDrop={true}
                    />
                </div>

                {isLoading && (
                    <div className="loading-section">
                        <div className="loading-spinner"></div>
                        <p>Loading MIDI file...</p>
                    </div>
                )}

                {error && (
                    <div className="error-section">
                        <div className="error-message">
                            <h3>Error</h3>
                            <p>{error}</p>
                            <button onClick={this.clearMidiData}>
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {midiDocument && !isLoading && (
                    <div className="midi-content">
                        <div className="content-header">
                            <MidiHeader
                                header={midiDocument.header}
                                text={midiText}
                            />

                            {this.renderStats()}

                            <div className="content-controls">
                                <button
                                    className="clear-button"
                                    onClick={this.clearMidiData}
                                >
                                    Load Different File
                                </button>
                            </div>
                        </div>

                        {this.renderTrackList()}


                    </div>
                )}
                <div className="usage-notes">
                    <h3>Usage Notes</h3>
                    <ul>
                        <li>You can select a subset of a track to extract by clicking and dragging on the timeline.</li>
                        <li>At present, the program only converts Note On/Note Off events.</li>
                        <li>The MIDI file you choose and the MPC pattern files are processed entirely on your computer. No data is sent elsewhere.</li>
                        <li>MPC pattern files can be imported into Akai Force, MPC Live, MPC X, and other compatible devices.</li>
                        <li>Each track is converted to a separate .mpcpattern file for easier organization.</li>
                    </ul>
                </div>
            </div>
        );
    }
}

/**
 * Widget Manager Class
 * Handles the integration with the original widget system
 */
export class WidgetManager {
    constructor(containerId) {
        this.idNumber = ++WidgetManager.idCounter;
        this.idString = '' + this.idNumber;
        this.homeId = this.idFor(containerId);
        this.container = document.getElementById(containerId);

        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found`);
        }
    }

    static idCounter = 0;

    idFor(elementId) {
        return '#' + elementId + this.idString;
    }

    bindGui() {
        // Set up any additional GUI bindings
        const buttonRow = document.querySelector(this.idFor('butnrow'));
        if (buttonRow) {
            // Additional button setup if needed
        }
    }

    setDisable(element, disabled) {
        if (element && element.prop) {
            element.prop('disabled', disabled);
            element.css('opacity', disabled ? 0.3 : 1);
        }
    }

    setEditData(data) {
        // Handle MIDI data editing
        if (!this.midiDoc) {
            // Initialize MIDI document viewer if needed
        }

        if (this.midiDoc && this.midiDoc.openOnBuffer) {
            this.midiDoc.openOnBuffer(data);
        }
    }

    openLocal(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.loadFile(files[0]);
        }
    }

    loadFile(file) {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const arrayBuffer = event.target.result;
                this.handleMidiData(arrayBuffer, file.name);
            } catch (error) {
                console.error('Error reading file:', error);
                alert(`Error reading file: ${error.message}`);
            }
        };

        reader.onerror = () => {
            console.error('Error reading file');
            alert('Error reading file');
        };

        reader.readAsArrayBuffer(file);
    }

    handleMidiData(data, filename) {
        try {
            const midiDocument = MidiDocument.fromBuffer(data);
            const converter = new MPCConverter(midiDocument);

            // Render React app
            const app = React.createElement(MidiConverterApp, {
                initialMidiDocument: midiDocument,
                initialMidiText: filename,
                initialConverter: converter
            });

            // You would need to use ReactDOM.render here in a real implementation
            console.log('MIDI data processed successfully');

        } catch (error) {
            console.error('Error processing MIDI data:', error);
            alert(`Error processing MIDI file: ${error.message}`);
        }
    }
}