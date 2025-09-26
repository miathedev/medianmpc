/**
 * MIDI Parser Module
 * Extracts from the minified code the MIDI parsing functionality
 */

export function parseMidi(buffer) {
    // This is a placeholder for the actual MIDI parsing logic
    // In the original minified code, this would be the complex parsing routine
    
    console.log('parseMidi called with buffer:', buffer);
    console.log('Buffer length:', buffer.byteLength);
    
    if (!buffer || buffer.byteLength === 0) {
        throw new Error('Invalid MIDI buffer: empty or null');
    }

    // Basic MIDI file structure parsing
    const view = new DataView(buffer);
    let offset = 0;

    console.log('First 16 bytes:', Array.from(new Uint8Array(buffer.slice(0, 16))).map(b => b.toString(16).padStart(2, '0')).join(' '));

    // Read header chunk
    const headerChunk = readChunk(view, offset);
    console.log('Header chunk:', headerChunk);
    
    if (headerChunk.type !== 'MThd') {
        throw new Error(`Invalid MIDI file: Missing header chunk, found "${headerChunk.type}"`);
    }

    offset += 8 + headerChunk.length;

    const header = parseHeader(headerChunk.data);
    console.log('Parsed header:', header);
    
    const tracks = [];

    // Read track chunks
    while (offset < buffer.byteLength) {
        console.log(`Reading track at offset ${offset}, remaining bytes: ${buffer.byteLength - offset}`);
        const trackChunk = readChunk(view, offset);
        console.log('Track chunk:', trackChunk);
        
        if (trackChunk.type === 'MTrk') {
            const parsedTrack = parseTrack(trackChunk.data, header.ticksPerQuarter);
            console.log(`Parsed track with ${parsedTrack.notes.length} notes:`, parsedTrack);
            tracks.push(parsedTrack);
        }
        offset += 8 + trackChunk.length;
    }

    const result = {
        header,
        tracks
    };
    
    console.log('Final parsed MIDI:', result);
    return result;
}

function readChunk(view, offset) {
    const type = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
    );
    
    const length = view.getUint32(offset + 4, false); // Big endian
    const data = new DataView(view.buffer, offset + 8, length);
    
    return { type, length, data };
}

function parseHeader(data) {
    const format = data.getUint16(0, false);
    const trackCount = data.getUint16(2, false);
    const timeDivision = data.getUint16(4, false);
    
    let ticksPerQuarter;
    if (timeDivision & 0x8000) {
        // SMPTE format
        const framesPerSecond = -(timeDivision >> 8);
        const ticksPerFrame = timeDivision & 0xFF;
        ticksPerQuarter = framesPerSecond * ticksPerFrame;
    } else {
        // Ticks per quarter note
        ticksPerQuarter = timeDivision;
    }

    return {
        format,
        trackCount,
        timeDivision,
        ticksPerQuarter
    };
}

function parseTrack(data, ticksPerQuarter) {
    const events = [];
    const notes = [];
    let offset = 0;
    let currentTime = 0;
    let runningStatus = 0;

    // Active notes tracking (for note-off events)
    const activeNotes = new Map();

    while (offset < data.byteLength) {
        console.log(`Track parsing: offset=${offset}, remaining=${data.byteLength - offset}`);
        
        // Read delta time
        const deltaTime = readVariableLength(data, offset);
        offset += deltaTime.bytes;
        currentTime += deltaTime.value;

        console.log(`Delta time: ${deltaTime.value}, new offset: ${offset}, current time: ${currentTime}`);

        // Check if we have enough bytes for status byte
        if (offset >= data.byteLength) {
            console.log('Reached end of track data');
            break;
        }

        // Read event
        let statusByte = data.getUint8(offset);
        console.log(`Status byte: 0x${statusByte.toString(16)}`);
        
        // Handle running status
        if (statusByte < 0x80) {
            statusByte = runningStatus;
        } else {
            runningStatus = statusByte;
            offset++;
        }

        const eventType = statusByte & 0xF0;
        const channel = statusByte & 0x0F;

        let event = {
            time: currentTime,
            type: eventType,
            channel
        };

        console.log(`Parsing event type: 0x${eventType.toString(16)}`);

        switch (eventType) {
            case 0x90: // Note On
                if (offset + 1 >= data.byteLength) {
                    console.log('Insufficient data for Note On event');
                    break;
                }
                const noteOnPitch = data.getUint8(offset++);
                const noteOnVelocity = data.getUint8(offset++);
                
                if (noteOnVelocity === 0) {
                    // Note on with velocity 0 = note off
                    handleNoteOff(noteOnPitch, currentTime, activeNotes, notes, ticksPerQuarter);
                } else {
                    handleNoteOn(noteOnPitch, noteOnVelocity, currentTime, activeNotes);
                }
                
                event.noteNumber = noteOnPitch;
                event.velocity = noteOnVelocity;
                break;

            case 0x80: // Note Off
                if (offset + 1 >= data.byteLength) {
                    console.log('Insufficient data for Note Off event');
                    break;
                }
                const noteOffPitch = data.getUint8(offset++);
                const noteOffVelocity = data.getUint8(offset++);
                
                handleNoteOff(noteOffPitch, currentTime, activeNotes, notes, ticksPerQuarter);
                
                event.noteNumber = noteOffPitch;
                event.velocity = noteOffVelocity;
                break;

            case 0xB0: // Control Change
                if (offset + 1 >= data.byteLength) {
                    console.log('Insufficient data for Control Change event');
                    break;
                }
                event.controller = data.getUint8(offset++);
                event.value = data.getUint8(offset++);
                break;

            case 0xC0: // Program Change
                if (offset >= data.byteLength) {
                    console.log('Insufficient data for Program Change event');
                    break;
                }
                event.program = data.getUint8(offset++);
                break;

            case 0xFF: // Meta Event
                if (offset >= data.byteLength) {
                    console.log('Insufficient data for Meta Event');
                    break;
                }
                const metaType = data.getUint8(offset++);
                const metaLength = readVariableLength(data, offset);
                offset += metaLength.bytes;
                
                event.metaType = metaType;
                
                if (metaType === 0x2F) { // End of track
                    break;
                } else if (metaType === 0x03) { // Track name
                    const nameBytes = new Uint8Array(data.buffer, data.byteOffset + offset, metaLength.value);
                    event.name = new TextDecoder().decode(nameBytes);
                }
                
                offset += metaLength.value;
                break;

            default:
                // Skip unknown events
                if (eventType >= 0x80 && eventType < 0xF0) {
                    offset += 2; // Most MIDI events are 3 bytes
                }
                break;
        }

        events.push(event);
    }

    return {
        events,
        notes,
        name: extractTrackName(events)
    };
}

function handleNoteOn(pitch, velocity, time, activeNotes) {
    const noteKey = `${pitch}`;
    activeNotes.set(noteKey, { pitch, velocity, startTime: time });
}

function handleNoteOff(pitch, time, activeNotes, notes, ticksPerQuarter) {
    const noteKey = `${pitch}`;
    const activeNote = activeNotes.get(noteKey);
    
    if (activeNote) {
        const duration = time - activeNote.startTime;
        notes.push({
            midi: pitch,
            velocity: activeNote.velocity,
            time: activeNote.startTime,
            duration: duration,
            ticks: activeNote.startTime,
            durationTicks: duration
        });
        activeNotes.delete(noteKey);
    }
}

function readVariableLength(data, offset) {
    let value = 0;
    let bytes = 0;
    let byte;

    do {
        if (offset + bytes >= data.byteLength) {
            console.error(`readVariableLength: trying to read beyond buffer bounds. offset=${offset}, bytes=${bytes}, buffer length=${data.byteLength}`);
            throw new Error(`Unexpected end of track data while reading variable length value`);
        }
        byte = data.getUint8(offset + bytes);
        value = (value << 7) | (byte & 0x7F);
        bytes++;
    } while (byte & 0x80 && bytes < 4);

    console.log(`Variable length read: value=${value}, bytes=${bytes}`);
    return { value, bytes };
}

function extractTrackName(events) {
    for (const event of events) {
        if (event.metaType === 0x03 && event.name) {
            return event.name;
        }
    }
    return '';
}