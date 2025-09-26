/**
 * MIDI File Parsing and Processing Utilities
 */

import MidiParser from 'midi-parser-js';

/**
 * Note class for handling musical notes
 */
export class Note {
    constructor(options = {}) {
        this.midi = options.midi || 60;
        this.octave = options.octave;
        this.name = options.name;
        this.velocity = options.velocity || 127;
        this.duration = options.duration || 0;
        this.time = options.time || 0;
    }

    // Convert MIDI number to note name
    static midiToNoteName(midiNumber) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return noteNames[midiNumber % 12];
    }

    // Convert MIDI number to octave
    static midiToOctave(midiNumber) {
        return Math.floor(midiNumber / 12) - 1;
    }

    // Get note name from MIDI number
    getNoteName() {
        return Note.midiToNoteName(this.midi);
    }

    // Get octave from MIDI number  
    getOctave() {
        return Note.midiToOctave(this.midi);
    }

    // Set note from name and octave
    setFromName(noteName) {
        const noteIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(noteName);
        if (noteIndex !== -1) {
            this.midi = 12 * (this.octave + 1) + noteIndex;
        }
    }

    // Convert to object for serialization
    toJSON() {
        return {
            midi: this.midi,
            name: this.getNoteName(),
            octave: this.getOctave(),
            velocity: this.velocity,
            duration: this.duration,
            time: this.time
        };
    }
}

/**
 * MIDI Track class for handling MIDI track data
 */
export class MidiTrack {
    constructor(trackData = {}) {
        this.events = trackData.events || [];
        this.notes = trackData.notes || [];
        this.name = trackData.name || '';
        this.channel = trackData.channel || 0;
        this.instrument = trackData.instrument || 0;
    }

    // Add a note to the track
    addNote(note) {
        this.notes.push(note);
    }

    // Get all notes in a time range
    getNotesInRange(startTime, endTime) {
        return this.notes.filter(note => {
            const noteEnd = note.time + note.duration;
            return note.time < endTime && noteEnd > startTime;
        });
    }

    // Convert track notes to MPC format
    toMPCPattern(options = {}) {
        const { startTime = 0, endTime = Infinity, trackNumber = 1 } = options;
        const notes = this.getNotesInRange(startTime, endTime);
        
        return {
            name: this.name || `Track ${trackNumber}`,
            events: notes.map(note => ({
                type: 2, // Note event type
                time: Math.round(note.time - startTime),
                duration: Math.round(note.duration),
                note: note.midi,
                velocity: note.velocity.toString(10).substring(0, 17),
                mod: 0,
                modVal: 0.5
            }))
        };
    }
}

/**
 * MIDI Document class for handling complete MIDI files
 */
export class MidiDocument {
    constructor(midiData) {
        this.header = midiData.header || {};
        this.tracks = (midiData.tracks || []).map(track => new MidiTrack(track));
        this.ticksPerQuarter = this.header.ticksPerQuarter || 480;
        this.timeDivision = this.header.timeDivision;
    }

    // Parse MIDI from binary data
    static fromBuffer(buffer) {
        console.log('MidiDocument.fromBuffer called with buffer:', buffer);
        
        // Convert ArrayBuffer to Uint8Array for midi-parser-js
        const uint8Array = new Uint8Array(buffer);
        console.log('Converted to Uint8Array:', uint8Array);
        
        // Parse using midi-parser-js
        const parsedMidi = MidiParser.parse(uint8Array);
        console.log('Parsed MIDI data:', parsedMidi);
        
        // Convert to our format
        const tracks = parsedMidi.track.map(trackData => {
            const notes = [];
            const events = trackData.event;
            let currentTime = 0;
            
            // Track active notes for note-on/note-off pairing
            const activeNotes = new Map();
            
            events.forEach(event => {
                currentTime += event.deltaTime;
                
                if (event.type === 9) { // Note On
                    const pitch = event.data[0];
                    const velocity = event.data[1];
                    
                    if (velocity === 0) {
                        // Note on with velocity 0 = note off
                        const noteStart = activeNotes.get(pitch);
                        if (noteStart) {
                            notes.push({
                                midi: pitch,
                                velocity: noteStart.velocity,
                                time: noteStart.time,
                                duration: currentTime - noteStart.time,
                                ticks: noteStart.time,
                                durationTicks: currentTime - noteStart.time
                            });
                            activeNotes.delete(pitch);
                        }
                    } else {
                        // Real note on
                        activeNotes.set(pitch, {
                            time: currentTime,
                            velocity: velocity
                        });
                    }
                } else if (event.type === 8) { // Note Off
                    const pitch = event.data[0];
                    const noteStart = activeNotes.get(pitch);
                    if (noteStart) {
                        notes.push({
                            midi: pitch,
                            velocity: noteStart.velocity,
                            time: noteStart.time,
                            duration: currentTime - noteStart.time,
                            ticks: noteStart.time,
                            durationTicks: currentTime - noteStart.time
                        });
                        activeNotes.delete(pitch);
                    }
                }
            });
            
            // Extract track name if available
            let trackName = '';
            events.forEach(event => {
                if (event.type === 255 && event.metaType === 3) { // Track name
                    trackName = String.fromCharCode(...event.data);
                }
            });
            
            return {
                notes: notes,
                name: trackName || '',
                events: events,
                channel: 0
            };
        });
        
        const midiData = {
            header: {
                format: parsedMidi.formatType,
                trackCount: parsedMidi.tracks,
                ticksPerQuarter: parsedMidi.timeDivision,
                timeDivision: parsedMidi.timeDivision
            },
            tracks: tracks
        };
        
        console.log('Converted MIDI data:', midiData);
        return new MidiDocument(midiData);
    }

    // Calculate time bounds for all tracks
    calcTimeBounds() {
        let minTime = Infinity;
        let maxTime = -Infinity;

        this.tracks.forEach(track => {
            track.notes.forEach(note => {
                minTime = Math.min(minTime, note.time);
                maxTime = Math.max(maxTime, note.time + note.duration);
            });
        });

        this.startTime = minTime === Infinity ? 0 : minTime;
        this.endTime = maxTime === -Infinity ? 0 : maxTime;
        
        return { startTime: this.startTime, endTime: this.endTime };
    }

    // Convert to MPC patterns
    toMPCPatterns(options = {}) {
        return this.tracks.map((track, index) => {
            return track.toMPCPattern({
                ...options,
                trackNumber: index + 1
            });
        });
    }

    // Export as MIDI buffer
    toBuffer() {
        throw new Error('MIDI writing functionality not yet implemented');
        // const midiData = {
        //     header: this.header,
        //     tracks: this.tracks.map(track => ({
        //         events: track.events,
        //         notes: track.notes.map(note => ({
        //             noteNumber: note.midi,
        //             velocity: note.velocity,
        //             time: note.time,
        //             duration: note.duration
        //         }))
        //     }))
        // };

        // return new Uint8Array(MidiWriter.writeMidi(midiData));
    }
}