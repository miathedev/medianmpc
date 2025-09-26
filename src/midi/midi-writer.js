/**
 * MIDI Writer Module
 * Handles writing MIDI data back to binary format
 */

export function writeMidi(midiData) {
    const { header, tracks } = midiData;
    
    // Calculate total file size
    let totalSize = 14; // Header chunk size
    const trackBuffers = tracks.map(track => writeTrack(track));
    totalSize += trackBuffers.reduce((sum, buffer) => sum + buffer.length + 8, 0);
    
    // Create output buffer
    const output = new ArrayBuffer(totalSize);
    const view = new DataView(output);
    let offset = 0;
    
    // Write header chunk
    offset += writeString(view, offset, 'MThd');
    view.setUint32(offset, 6, false); // Header length
    offset += 4;
    
    view.setUint16(offset, header.format || 1, false);
    offset += 2;
    view.setUint16(offset, tracks.length, false);
    offset += 2;
    view.setUint16(offset, header.ticksPerQuarter || 480, false);
    offset += 2;
    
    // Write track chunks
    trackBuffers.forEach(trackBuffer => {
        offset += writeString(view, offset, 'MTrk');
        view.setUint32(offset, trackBuffer.length, false);
        offset += 4;
        
        new Uint8Array(output, offset, trackBuffer.length).set(new Uint8Array(trackBuffer));
        offset += trackBuffer.length;
    });
    
    return output;
}

function writeTrack(track) {
    const events = track.events || [];
    const notes = track.notes || [];
    
    // Convert notes to MIDI events
    const midiEvents = [];
    let lastTime = 0;
    
    // Add track name if present
    if (track.name) {
        midiEvents.push({
            deltaTime: 0,
            type: 0xFF,
            metaType: 0x03,
            data: new TextEncoder().encode(track.name)
        });
    }
    
    // Convert notes to note-on/note-off events
    const noteEvents = [];
    
    notes.forEach(note => {
        noteEvents.push({
            time: note.time,
            type: 'noteOn',
            pitch: note.noteNumber || note.midi,
            velocity: note.velocity || 127,
            channel: note.channel || 0
        });
        
        noteEvents.push({
            time: note.time + note.duration,
            type: 'noteOff',
            pitch: note.noteNumber || note.midi,
            velocity: 64,
            channel: note.channel || 0
        });
    });
    
    // Sort events by time
    noteEvents.sort((a, b) => a.time - b.time);
    
    // Convert to MIDI format
    noteEvents.forEach(event => {
        const deltaTime = Math.max(0, event.time - lastTime);
        lastTime = event.time;
        
        if (event.type === 'noteOn') {
            midiEvents.push({
                deltaTime,
                type: 0x90 | (event.channel & 0x0F),
                data: [event.pitch, event.velocity]
            });
        } else if (event.type === 'noteOff') {
            midiEvents.push({
                deltaTime,
                type: 0x80 | (event.channel & 0x0F),
                data: [event.pitch, event.velocity]
            });
        }
    });
    
    // Add end of track
    midiEvents.push({
        deltaTime: 0,
        type: 0xFF,
        metaType: 0x2F,
        data: new Uint8Array(0)
    });
    
    // Calculate track size
    let trackSize = 0;
    midiEvents.forEach(event => {
        trackSize += getVariableLengthSize(event.deltaTime);
        trackSize += 1; // Status byte
        
        if (event.type === 0xFF) {
            trackSize += 1; // Meta type
            trackSize += getVariableLengthSize(event.data.length);
            trackSize += event.data.length;
        } else {
            trackSize += event.data.length;
        }
    });
    
    // Write track data
    const trackBuffer = new ArrayBuffer(trackSize);
    const trackView = new DataView(trackBuffer);
    let trackOffset = 0;
    
    midiEvents.forEach(event => {
        trackOffset += writeVariableLength(trackView, trackOffset, event.deltaTime);
        
        if (event.type === 0xFF) {
            trackView.setUint8(trackOffset++, 0xFF);
            trackView.setUint8(trackOffset++, event.metaType);
            trackOffset += writeVariableLength(trackView, trackOffset, event.data.length);
            new Uint8Array(trackBuffer, trackOffset, event.data.length).set(event.data);
            trackOffset += event.data.length;
        } else {
            trackView.setUint8(trackOffset++, event.type);
            event.data.forEach(byte => {
                trackView.setUint8(trackOffset++, byte);
            });
        }
    });
    
    return trackBuffer;
}

function writeString(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
    return str.length;
}

function writeVariableLength(view, offset, value) {
    const bytes = [];
    bytes.push(value & 0x7F);
    value >>= 7;
    
    while (value > 0) {
        bytes.push((value & 0x7F) | 0x80);
        value >>= 7;
    }
    
    bytes.reverse();
    bytes.forEach((byte, index) => {
        view.setUint8(offset + index, byte);
    });
    
    return bytes.length;
}

function getVariableLengthSize(value) {
    if (value < 0x80) return 1;
    if (value < 0x4000) return 2;
    if (value < 0x200000) return 3;
    return 4;
}