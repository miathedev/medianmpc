/**
 * MIDI File Parsing and Processing Utilities
 */

import MidiParser from 'midi-parser-js';

const hasTextDecoder = typeof TextDecoder !== 'undefined';
const textDecoder = hasTextDecoder ? new TextDecoder('utf-8', { fatal: false }) : null;

const decodeMetaText = (data = []) => {
    if (!data || data.length === 0) {
        return '';
    }

    if (textDecoder) {
        try {
            return textDecoder.decode(new Uint8Array(data));
        } catch (error) {
            console.warn('MidiUtils: Failed to decode meta text with TextDecoder, falling back to char codes.', error);
        }
    }

    return String.fromCharCode(...data);
};

const sanitizeMetaText = (text = '') => {
    if (!text) {
        return '';
    }

    const cleaned = text
        .replace(/[\u0000-\u001F\u007F]/g, ' ') // strip control chars
        .replace(/\s+/g, ' ')                     // collapse whitespace
        .trim();

    return cleaned;
};

export const GENERAL_MIDI_INSTRUMENTS = [
    'Acoustic Grand Piano',
    'Bright Acoustic Piano',
    'Electric Grand Piano',
    'Honky-tonk Piano',
    'Electric Piano 1',
    'Electric Piano 2',
    'Harpsichord',
    'Clavinet',
    'Celesta',
    'Glockenspiel',
    'Music Box',
    'Vibraphone',
    'Marimba',
    'Xylophone',
    'Tubular Bells',
    'Dulcimer',
    'Drawbar Organ',
    'Percussive Organ',
    'Rock Organ',
    'Church Organ',
    'Reed Organ',
    'Accordion',
    'Harmonica',
    'Tango Accordion',
    'Acoustic Guitar (nylon)',
    'Acoustic Guitar (steel)',
    'Electric Guitar (jazz)',
    'Electric Guitar (clean)',
    'Electric Guitar (muted)',
    'Overdriven Guitar',
    'Distortion Guitar',
    'Guitar Harmonics',
    'Acoustic Bass',
    'Electric Bass (finger)',
    'Electric Bass (pick)',
    'Fretless Bass',
    'Slap Bass 1',
    'Slap Bass 2',
    'Synth Bass 1',
    'Synth Bass 2',
    'Violin',
    'Viola',
    'Cello',
    'Contrabass',
    'Tremolo Strings',
    'Pizzicato Strings',
    'Orchestral Harp',
    'Timpani',
    'String Ensemble 1',
    'String Ensemble 2',
    'Synth Strings 1',
    'Synth Strings 2',
    'Choir Aahs',
    'Voice Oohs',
    'Synth Choir',
    'Orchestra Hit',
    'Trumpet',
    'Trombone',
    'Tuba',
    'Muted Trumpet',
    'French Horn',
    'Brass Section',
    'Synth Brass 1',
    'Synth Brass 2',
    'Soprano Sax',
    'Alto Sax',
    'Tenor Sax',
    'Baritone Sax',
    'Oboe',
    'English Horn',
    'Bassoon',
    'Clarinet',
    'Piccolo',
    'Flute',
    'Recorder',
    'Pan Flute',
    'Blown Bottle',
    'Shakuhachi',
    'Whistle',
    'Ocarina',
    'Lead 1 (square)',
    'Lead 2 (sawtooth)',
    'Lead 3 (calliope)',
    'Lead 4 (chiff)',
    'Lead 5 (charang)',
    'Lead 6 (voice)',
    'Lead 7 (fifths)',
    'Lead 8 (bass + lead)',
    'Pad 1 (new age)',
    'Pad 2 (warm)',
    'Pad 3 (polysynth)',
    'Pad 4 (choir)',
    'Pad 5 (bowed)',
    'Pad 6 (metallic)',
    'Pad 7 (halo)',
    'Pad 8 (sweep)',
    'FX 1 (rain)',
    'FX 2 (soundtrack)',
    'FX 3 (crystal)',
    'FX 4 (atmosphere)',
    'FX 5 (brightness)',
    'FX 6 (goblins)',
    'FX 7 (echoes)',
    'FX 8 (sci-fi)',
    'Sitar',
    'Banjo',
    'Shamisen',
    'Koto',
    'Kalimba',
    'Bag pipe',
    'Fiddle',
    'Shanai',
    'Tinkle Bell',
    'Agogo',
    'Steel Drums',
    'Woodblock',
    'Taiko Drum',
    'Melodic Tom',
    'Synth Drum',
    'Reverse Cymbal',
    'Guitar Fret Noise',
    'Breath Noise',
    'Seashore',
    'Bird Tweet',
    'Telephone Ring',
    'Helicopter',
    'Applause',
    'Gunshot'
];

export const getGeneralMidiInstrumentName = (programNumber) => {
    if (typeof programNumber !== 'number' || Number.isNaN(programNumber)) {
        return '';
    }

    const index = Math.max(0, Math.min(GENERAL_MIDI_INSTRUMENTS.length - 1, programNumber));
    return GENERAL_MIDI_INSTRUMENTS[index] || `Program ${programNumber + 1}`;
};
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
        this.instrument = trackData.instrument !== undefined ? trackData.instrument : null;
        this.instrumentName = trackData.instrumentName || '';
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

            const activeNotes = new Map();
            const programByChannel = new Map();
            const channelNoteCounts = new Map();

            let primaryChannel = null;
            let instrumentProgram = null;
            let instrumentName = '';
            let trackName = '';

            // First pass to capture static metadata
            events.forEach(event => {
                if (event.type === 255 && event.metaType === 3) { // Track name
                    const decodedName = decodeMetaText(event.data);
                    const sanitized = sanitizeMetaText(decodedName);
                    if (sanitized) {
                        trackName = sanitized;
                    }
                } else if (event.type === 255 && event.metaType === 4) { // Instrument name
                    const decodedInstrument = decodeMetaText(event.data);
                    const sanitizedInstrument = sanitizeMetaText(decodedInstrument);
                    if (sanitizedInstrument) {
                        instrumentName = sanitizedInstrument;
                    }
                }
            });

            events.forEach(event => {
                currentTime += event.deltaTime;
                const channel = typeof event.channel === 'number' ? event.channel : 0;

                if (event.type === 12) { // Program change
                    const programNumber = Array.isArray(event.data) ? event.data[0] : undefined;
                    if (typeof programNumber === 'number') {
                        programByChannel.set(channel, programNumber);
                        if (instrumentProgram === null) {
                            instrumentProgram = programNumber;
                        }
                        if (primaryChannel === null) {
                            primaryChannel = channel;
                        }
                    }
                    return;
                }

                if (event.type === 9) { // Note On
                    const pitch = event.data[0];
                    const velocity = event.data[1];
                    const noteKey = `${channel}:${pitch}`;

                    if (velocity === 0) {
                        // Note on with velocity 0 = note off
                        const noteStart = activeNotes.get(noteKey);
                        if (noteStart) {
                            notes.push({
                                midi: pitch,
                                velocity: noteStart.velocity,
                                time: noteStart.time,
                                duration: currentTime - noteStart.time,
                                ticks: noteStart.time,
                                durationTicks: currentTime - noteStart.time,
                                channel: noteStart.channel
                            });
                            activeNotes.delete(noteKey);
                        }
                    } else {
                        // Real note on
                        activeNotes.set(noteKey, {
                            time: currentTime,
                            velocity: velocity,
                            midi: pitch,
                            channel: channel
                        });
                        if (primaryChannel === null) {
                            primaryChannel = channel;
                        }
                        channelNoteCounts.set(channel, (channelNoteCounts.get(channel) || 0) + 1);
                    }
                } else if (event.type === 8) { // Note Off
                    const pitch = event.data[0];
                    const noteKey = `${channel}:${pitch}`;
                    const noteStart = activeNotes.get(noteKey);
                    if (noteStart) {
                        notes.push({
                            midi: pitch,
                            velocity: noteStart.velocity,
                            time: noteStart.time,
                            duration: currentTime - noteStart.time,
                            ticks: noteStart.time,
                            durationTicks: currentTime - noteStart.time,
                            channel: noteStart.channel
                        });
                        activeNotes.delete(noteKey);
                    }
                }
            });

            // Close any lingering active notes to prevent hangs
            activeNotes.forEach(noteStart => {
                notes.push({
                    midi: noteStart.midi,
                    velocity: noteStart.velocity,
                    time: noteStart.time,
                    duration: 0,
                    ticks: noteStart.time,
                    durationTicks: 0,
                    channel: noteStart.channel
                });
            });

            if (primaryChannel === null && channelNoteCounts.size > 0) {
                primaryChannel = [...channelNoteCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
            }

            if (!instrumentName) {
                const fallbackProgram = (primaryChannel !== null && programByChannel.has(primaryChannel))
                    ? programByChannel.get(primaryChannel)
                    : instrumentProgram;

                if (typeof fallbackProgram === 'number') {
                    instrumentProgram = fallbackProgram;
                    instrumentName = getGeneralMidiInstrumentName(fallbackProgram);
                }
            }

            const trackChannel = primaryChannel !== null ? primaryChannel : 0;

            return {
                notes: notes,
                name: trackName || '',
                events: events,
                channel: trackChannel,
                instrument: typeof instrumentProgram === 'number' ? instrumentProgram : null,
                instrumentName: instrumentName || ''
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