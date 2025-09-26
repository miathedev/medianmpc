/**
 * Track Component
 * Displays individual MIDI track with conversion controls
 */

import React, { Component } from 'react';
import { MidiVisualizer } from './midi-visualizer.js';
import { MPCConverter } from '../converter/mpc-converter.js';
import { MidiPlayer } from './midi-player.js';

export class TrackComponent extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedRange: { start: 0, end: 0 },
            isConverting: false
        };
        
        this.visualizerRef = React.createRef();
    }

    handleTimeRangeSelect = (range) => {
        this.setState({ selectedRange: range });
    };

    handleConvertToMPC = () => {
    const { track, trackNum, converter, song, midiArrayBuffer } = this.props;
        const { selectedRange } = this.state;
        
        if (!track || !converter) {
            console.error('Missing track or converter');
            return;
        }

        this.setState({ isConverting: true });

        try {
            // Get selected time range from visualizer
            let timeRange = this.visualizerRef.current 
                ? this.visualizerRef.current.getSelectedTimes()
                : selectedRange;

            console.log('Time range before processing:', timeRange);

            // If no selection is made (start == end), use the entire track
            if (timeRange.start === timeRange.end || timeRange.start === 0 && timeRange.end === 0) {
                // Calculate the full time range of the track
                let minTime = Infinity;
                let maxTime = -Infinity;
                
                if (track.notes && track.notes.length > 0) {
                    track.notes.forEach(note => {
                        minTime = Math.min(minTime, note.time);
                        maxTime = Math.max(maxTime, note.time + note.duration);
                    });
                    
                    timeRange = {
                        start: minTime === Infinity ? 0 : minTime,
                        end: maxTime === -Infinity ? 1000 : maxTime
                    };
                }
            }

            console.log('Final time range for conversion:', timeRange);

            // Convert track to MPC format
            const mpcPattern = converter.convertTrackToMPC(
                trackNum,
                timeRange.start,
                timeRange.end,
                converter.lowTicks,
                false
            );

            // Create downloadable file
            const { blob, filename } = MPCConverter.createMPCFile(
                mpcPattern, 
                trackNum, 
                song.name || 'midi_file'
            );

            // Trigger download
            this.downloadFile(blob, filename);

        } catch (error) {
            console.error('Error converting to MPC:', error);
            alert(`Error converting track: ${error.message}`);
        } finally {
            this.setState({ isConverting: false });
        }
    };

    downloadFile = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    getTrackStats = () => {
        const { track } = this.props;
        if (!track || !track.notes) return null;

        const noteCount = track.notes.length;
        if (noteCount === 0) return { noteCount: 0 };

        let minPitch = Infinity;
        let maxPitch = -Infinity;
        let totalDuration = 0;
        let minTime = Infinity;
        let maxTime = -Infinity;

        track.notes.forEach(note => {
            minPitch = Math.min(minPitch, note.midi);
            maxPitch = Math.max(maxPitch, note.midi);
            totalDuration += note.duration;
            minTime = Math.min(minTime, note.time);
            maxTime = Math.max(maxTime, note.time + note.duration);
        });

        return {
            noteCount,
            pitchRange: { min: minPitch, max: maxPitch },
            timeRange: { start: minTime, end: maxTime, duration: maxTime - minTime },
            averageDuration: totalDuration / noteCount
        };
    };

    formatNoteName = (midiNumber) => {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNumber / 12) - 1;
        const noteName = noteNames[midiNumber % 12];
        return `${noteName}${octave}`;
    };

    formatTime = (ticks, ticksPerQuarter = 480) => {
        const seconds = (ticks / ticksPerQuarter / 2); // Assuming 120 BPM
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(1);
        return `${minutes}:${remainingSeconds.padStart(4, '0')}`;
    };

    render() {
    const { track, trackNum, song, toneTrack, toneMidi } = this.props;
        const { selectedRange, isConverting } = this.state;
        
        console.log(`Rendering track ${trackNum}:`, track);
        
        if (!track) {
            return (
                <div className="track-component empty">
                    <h3>Track {trackNum}</h3>
                    <p>No track data available</p>
                </div>
            );
        }

    const stats = this.getTrackStats();
    const hasSelection = selectedRange.start !== selectedRange.end;
    // Fix: get midiArrayBuffer from props
    const { midiArrayBuffer } = this.props;
    console.log(`Track ${trackNum} stats:`, stats);

        return (
            <div className="track-component">
                <div className="track-header">
                    <h3>
                        Track {trackNum}
                        {track.name && (
                            <span className="track-name">: {track.name}</span>
                        )}
                    </h3>
                    
                    {stats && (
                        <div className="track-stats">
                            <span className="stat">Notes: {stats.noteCount}</span>
                            {stats.noteCount > 0 && (
                                <>
                                    <span className="stat">
                                        Range: {this.formatNoteName(stats.pitchRange.min)} - {this.formatNoteName(stats.pitchRange.max)}
                                    </span>
                                    <span className="stat">
                                        Duration: {this.formatTime(stats.timeRange.duration)}
                                    </span>
                                    {track.channel !== undefined && (
                                        <span className="stat">Channel: {track.channel + 1}</span>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {stats && stats.noteCount > 0 && (
                    <div className="track-content">
                        <MidiVisualizer
                            ref={this.visualizerRef}
                            track={track}
                            onTimeRangeSelect={this.handleTimeRangeSelect}
                        />
                        
                        <div className="track-controls">
                            <div className="selection-info">
                                {hasSelection ? (
                                    <span>
                                        Selection: {this.formatTime(selectedRange.start)} - {this.formatTime(selectedRange.end)}
                                        ({this.formatTime(selectedRange.end - selectedRange.start)} duration)
                                    </span>
                                ) : (
                                    <span>Click and drag on the timeline to select a range</span>
                                )}
                            </div>
                            
                            <div className="action-buttons">
                                <button 
                                    className="mpc-button"
                                    onClick={this.handleConvertToMPC}
                                    disabled={isConverting || !stats || stats.noteCount === 0}
                                >
                                    {isConverting ? 'Converting...' : '+ MPC Pattern'}
                                </button>
                                <MidiPlayer
                                    midiArrayBuffer={midiArrayBuffer}
                                    trackIndex={this.props.midiTrackIndex}
                                    toneTrack={toneTrack}
                                    toneMidi={toneMidi}
                                />
                                {hasSelection && (
                                    <button
                                        className="clear-selection-button"
                                        onClick={() => this.setState({ selectedRange: { start: 0, end: 0 } })}
                                    >
                                        Clear Selection
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {stats && stats.noteCount === 0 && (
                    <div className="empty-track">
                        <p>This track contains no notes to convert.</p>
                    </div>
                )}
            </div>
        );
    }
}

/**
 * Track Header Component
 * Displays basic information about the MIDI file
 */
export class MidiHeader extends Component {
    render() {
        const { header, text } = this.props;
        
        if (!header) return null;

        return (
            <div className="midi-header">
                <h2>MIDI File Information</h2>
                <div className="header-info">
                    <div className="header-row">
                        <span className="label">Format:</span>
                        <span className="value">Type {header.format || 0}</span>
                    </div>
                    <div className="header-row">
                        <span className="label">Tracks:</span>
                        <span className="value">{header.trackCount || 0}</span>
                    </div>
                    <div className="header-row">
                        <span className="label">Time Division:</span>
                        <span className="value">{header.ticksPerQuarter || header.timeDivision || 480} ticks per quarter note</span>
                    </div>
                    {text && (
                        <div className="header-row">
                            <span className="label">File:</span>
                            <span className="value">{text}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}