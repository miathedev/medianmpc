/**
 * MPC Pattern Converter
 * Handles conversion from MIDI to MPC pattern format
 */

import { Note, MidiDocument } from '../midi/midi-utils.js';

export class MPCConverter {
    constructor(midiDocument) {
        this.midi = midiDocument;
        this.lowTicks = 0;
        this.highTicks = 0;
    }

    /**
     * Calculate time bounds for the MIDI document
     */
    calcTimeBounds() {
        let minTime = Infinity;
        let maxTime = -Infinity;

        console.log('Calculating time bounds for', this.midi.tracks.length, 'tracks');

        this.midi.tracks.forEach((track, trackIndex) => {
            console.log(`Track ${trackIndex}: ${track.notes?.length || 0} notes`);
            if (track.notes) {
                track.notes.forEach(note => {
                    minTime = Math.min(minTime, note.time);
                    maxTime = Math.max(maxTime, note.time + note.duration);
                });
            }
        });

        this.lowTicks = minTime === Infinity ? 0 : minTime;
        this.highTicks = maxTime === -Infinity ? 0 : maxTime;
        
        console.log(`Time bounds: ${this.lowTicks} to ${this.highTicks}`);
        return { lowTicks: this.lowTicks, highTicks: this.highTicks };
    }

    /**
     * Convert a MIDI track to MPC pattern format
     */
    convertTrackToMPC(trackNumber, startTime, endTime, baseTicks = 0, isNotLast = false) {
        console.log(`convertTrackToMPC called: trackNumber=${trackNumber}, startTime=${startTime}, endTime=${endTime}, baseTicks=${baseTicks}`);
        
        const trackIndex = trackNumber - 1;
        const track = this.midi.tracks[trackIndex];
        
        console.log(`Looking for track at index ${trackIndex} from ${this.midi.tracks.length} tracks`);
        console.log(`Track data:`, track);
        
        if (!track) {
            throw new Error(`Track ${trackNumber} not found`);
        }

        const midiPPQ = this.midi.ticksPerQuarter || 480;
        console.log(`MidiPPQ= ${midiPPQ}`);

        const events = [];
        let maxTime = 0;

        console.log(`Track has ${track.notes?.length || 0} notes`);
        
        // Filter notes in time range
        const notesInRange = track.notes.filter(note => {
            const noteStartTime = note.time;
            const noteEndTime = note.time + note.duration;
            
            // Check if note overlaps with selected time range
            const inRange = noteStartTime < endTime && noteEndTime > startTime;
            console.log(`Note at time ${noteStartTime}-${noteEndTime}, range ${startTime}-${endTime}, in range: ${inRange}`);
            return inRange;
        });

        console.log(`Converting ${notesInRange.length} notes from track ${trackNumber}`);

        notesInRange.forEach((note, index) => {
            let lastTime = 0;
            
            if (index > 0) {
                lastTime = events[events.length - 1]?.time || 0;
            }

            const noteStartTicks = note.time - baseTicks;
            const noteDurationTicks = note.duration;
            
            // Convert to MPC time units (960 PPQ)
            const mpcStartTime = Math.round(960 * noteStartTicks / midiPPQ);
            const mpcDuration = Math.round(960 * noteDurationTicks / midiPPQ);
            const mpcEndTime = mpcStartTime + mpcDuration;

            if (mpcEndTime > maxTime) {
                maxTime = mpcEndTime;
            }

            // Check for out-of-order MIDI events
            if (mpcStartTime <= lastTime) {
                console.log(`*** Out of order MIDI: ${mpcStartTime} <= ${lastTime}`);
            }

            const velocityNormalized = note.velocity / 127;
            const velocityStringRaw = velocityNormalized.toString(10);
            const velocityString = velocityStringRaw.length > 17
                ? velocityStringRaw.substring(0, 17)
                : velocityStringRaw;

            const mpcEvent = {
                type: 2,                    // MPC note event type
                time: mpcStartTime,         // Start time in MPC ticks
                len: mpcDuration,           // Duration in MPC ticks
                "1": note.midi,             // MIDI note number
                "2": velocityString,        // Velocity in 0-1 range (trimmed string)
                "3": 0,
                mod: 0,
                modVal: 0.5
            };

            events.push(mpcEvent);
        });

        const pattern = {
            pattern: {
                length: 9223372036854775807, // Standard MPC pattern length (exact value from original)
                events: events
            }
        };

        // Add MIDI channel information for reference (not part of MPC format)
        // pattern.midiChannel = track.channel || 0;

        return pattern;
    }

    /**
     * Convert entire MIDI document to MPC patterns
     */
    convertAllTracksToMPC() {
        this.calcTimeBounds();
        
        return this.midi.tracks.map((track, index) => {
            const trackNumber = index + 1;
            return {
                trackNumber,
                pattern: this.convertTrackToMPC(
                    trackNumber, 
                    this.lowTicks, 
                    this.highTicks, 
                    this.lowTicks,
                    index < this.midi.tracks.length - 1
                )
            };
        });
    }

    /**
     * Export MPC pattern as JSON string matching original implementation
     */
    static exportMPCPattern(pattern) {
        if (!pattern || typeof pattern !== 'object' || !pattern.pattern) {
            return '';
        }

        const events = Array.isArray(pattern.pattern.events) ? pattern.pattern.events : [];
        const eol = '\r\n';

        const lines = [];
        lines.push('{');
        lines.push('    "pattern": {');
        lines.push('        "length": 9223372036854775807,');
        lines.push('        "events": [');

        const staticEvents = [
            { type: 1, time: 0, len: 0, one: 0, two: '0.0', modVal: '0.0' },
            { type: 1, time: 0, len: 0, one: 32, two: '0.0', modVal: '0.0' },
            { type: 1, time: 0, len: 0, one: 130, two: '0.787401556968689', modVal: '0.0' }
        ];

        const formatStaticEvent = (event, withComma) => [
            '            {',
            `                "type": ${event.type},`,
            `                "time": ${event.time},`,
            `                "len": ${event.len},`,
            `                "1": ${event.one},`,
            `                "2": ${event.two},`,
            '                "3": 0,',
            '                "mod": 0,',
            `                "modVal": ${event.modVal}`,
            `            }${withComma ? ',' : ''}`
        ].join(eol);

        staticEvents.forEach((event, index) => {
            const needsComma = index < staticEvents.length - 1 || events.length > 0;
            lines.push(formatStaticEvent(event, needsComma));
        });

        const formatDynamicEvent = (event, withComma) => {
            const velocityValue = event['2'];
            const value2 = typeof velocityValue === 'string'
                ? velocityValue
                : Number(velocityValue || 0).toString(10);

            return [
                '            {',
                `                "type": ${event.type ?? 2},`,
                `                "time": ${event.time ?? 0},`,
                `                "len": ${event.len ?? 0},`,
                `                "1": ${event['1'] ?? 0},`,
                `                "2": ${value2},`,
                `                "3": ${event['3'] ?? 0},`,
                `                "mod": ${event.mod ?? 0},`,
                `                "modVal": ${event.modVal ?? 0}`,
                `            }${withComma ? ',' : ''}`
            ].join(eol);
        };

        events.forEach((event, index) => {
            const isLast = index === events.length - 1;
            lines.push(formatDynamicEvent(event, !isLast));
        });

        lines.push('        ]');
        lines.push('    }');
        lines.push('}');

        return lines.join(eol) + eol;
    }

    /**
     * Create downloadable MPC pattern file
     */
    static createMPCFile(pattern, trackNumber, originalFilename) {
        const patternJSON = MPCConverter.exportMPCPattern(pattern);
        const blob = new Blob([patternJSON], { type: 'application/json' });
        
        // Generate filename
        const baseName = originalFilename 
            ? originalFilename.split('/').pop().split('.')[0]
            : 'midi_pattern';
        const filename = `${baseName}_Track_${trackNumber}.mpcpattern`;
        
        return { blob, filename };
    }
}

/**
 * Utility functions for MPC pattern format
 */
export class MPCPatternUtils {
    /**
     * Validate MPC pattern structure
     */
    static validatePattern(pattern) {
        if (!pattern || typeof pattern !== 'object') {
            return false;
        }

        if (!pattern.pattern || typeof pattern.pattern !== 'object') {
            return false;
        }

        if (!Array.isArray(pattern.pattern.events)) {
            return false;
        }

        return pattern.pattern.events.every(event => {
            const velocityValue = event['2'];
            const velocityNumeric = typeof velocityValue === 'number' ? velocityValue : Number(velocityValue);

            return (
                typeof event.type === 'number' &&
                typeof event.time === 'number' &&
                typeof event.len === 'number' &&
                typeof event['1'] === 'number' &&
                !Number.isNaN(velocityNumeric)
            );
        });
    }

    /**
     * Get pattern statistics
     */
    static getPatternStats(pattern) {
        if (!MPCPatternUtils.validatePattern(pattern)) {
            return null;
        }

        const events = pattern.pattern.events;
        const totalEvents = events.length;
        
        let minTime = Infinity;
        let maxTime = -Infinity;
        let minNote = Infinity;
        let maxNote = -Infinity;
        
        events.forEach(event => {
            minTime = Math.min(minTime, event.time);
            maxTime = Math.max(maxTime, event.time + event.len);
            minNote = Math.min(minNote, event['1']);
            maxNote = Math.max(maxNote, event['1']);
        });

        return {
            totalEvents,
            timeRange: { start: minTime, end: maxTime, duration: maxTime - minTime },
            noteRange: { lowest: minNote, highest: maxNote, span: maxNote - minNote },
            patternLength: pattern.pattern.length
        };
    }

    /**
     * Merge multiple patterns into one
     */
    static mergePatterns(patterns) {
        const mergedEvents = [];

        patterns.forEach(pattern => {
            if (MPCPatternUtils.validatePattern(pattern)) {
                mergedEvents.push(...pattern.pattern.events);
            }
        });

        // Keep original order - don't sort events

        return {
            pattern: {
                length: 9223372036854775807, // Use exact value from original
                events: mergedEvents
            }
        };
    }
}