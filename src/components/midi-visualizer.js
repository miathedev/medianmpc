/**
 * MIDI Visualizer Component
 * Displays MIDI tracks graphically with div-based rendering and drag selection
 */

import React, { Component } from 'react';

/**
 * MIDI Grid Component - Renders the actual note grid using divs (like the original)
 */
class MidiGrid extends Component {
    constructor(props) {
        super(props);
        this.el = null;
        this.insetX = 6;
        this.insetY = 4;
        this.noteHeight = 4;
        this.scaling = 0.5; // Reduced scaling to fit notes in viewport
        this.dragging = false;
        this.dragStart = 0;
        this.start = 0;
        this.end = 0;
        this.duration = 0;
        this.height = 0;
        this.width = 0;
        this.selection = null;
    }

    componentDidMount() {
        this.symbolize();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.track !== this.props.track || prevProps.converter !== this.props.converter) {
            this.symbolize();
        }
    }

    symbolize() {
        console.log("Device Pixel Ratio: " + window.devicePixelRatio);
        
        const track = this.props.track;
        
        // Get the converter's calculated low time, or calculate it ourselves
        let lowTime = 0;
        if (this.props.converter && this.props.converter.lowTicks !== undefined) {
            lowTime = this.props.converter.lowTicks;
        } else if (track.notes && track.notes.length > 0) {
            // Calculate minimum time from the track's notes
            lowTime = Math.min(...track.notes.map(note => note.time));
        }
        
        const notes = track.notes;
        
        console.log('Visualizer symbolize called with:', {
            track: track,
            lowTime: lowTime,
            notesCount: notes ? notes.length : 0,
            firstFewNotes: notes ? notes.slice(0, 3) : null
        });
        
        if (!notes || notes.length === 0) {
            console.log('No notes to visualize');
            return;
        }

        let minTime = 1e8;
        let maxTime = -1e8;
        let minPitch = 1e3;
        let maxPitch = -1e3;
        const noteCount = notes.length;

        // Find bounds
        for (let i = 0; i < noteCount; ++i) {
            const note = notes[i];
            if (note.midi < minPitch) minPitch = note.midi;
            if (note.midi > maxPitch) maxPitch = note.midi;
            
            const noteStart = note.time;
            const noteEnd = noteStart + note.duration;
            if (noteStart < minTime) minTime = noteStart;
            if (noteEnd > maxTime) maxTime = noteEnd;
        }

        const pitchRange = maxPitch - minPitch;
        if (maxTime - minTime < 0 || pitchRange < 0) {
            return;
        }

        // Calculate dynamic scaling to fit in a reasonable viewport width
        const timeRange = maxTime - minTime;
        const targetWidth = 800; // Target width in pixels
        this.scaling = targetWidth / timeRange; // Dynamic scaling based on time range
        
        console.log(`Time range: ${timeRange}, calculated scaling: ${this.scaling}`);

        // Clear existing content
        if (this.el) {
            this.el.innerHTML = '';
        }

        const gridDiv = document.createElement('div');
        gridDiv.className = 'midigrid';
        
        console.log("Min time: " + minTime + " " + lowTime);

        // Draw each note
        for (let i = 0; i < noteCount; ++i) {
            const note = notes[i];
            const noteTime = note.time - lowTime;
            const x = Math.round(noteTime * this.scaling + this.insetX);
            let width = Math.round(note.duration * this.scaling);
            
            // Minimum width for visibility
            if (width < 2) width = 2;
            if (width > 50 && this.scaling > 1) width = Math.max(2, width - 1);

            const y = (maxPitch - note.midi) * this.noteHeight + this.insetY;
            
            const noteDiv = document.createElement('div');
            noteDiv.className = 'midiitem';
            noteDiv.style.left = x + 'px';
            noteDiv.style.top = y + 'px';
            noteDiv.style.width = width + 'px';
            noteDiv.style.height = this.noteHeight + 'px'; // Add explicit height
            
            console.log(`Created note div: x=${x}, y=${y}, width=${width}, height=${this.noteHeight}`);
            
            gridDiv.appendChild(noteDiv);
        }

        this.duration = maxTime - lowTime;
        const totalWidth = Math.round((maxTime - lowTime) * this.scaling + 2 * this.insetX);
        const totalHeight = Math.round((pitchRange + 1) * this.noteHeight + 2 * this.insetY + 2);
        
        this.height = totalHeight;
        this.width = totalWidth;

        // Create selection overlay
        this.selection = document.createElement('div');
        this.selection.className = 'selbox';
        gridDiv.appendChild(this.selection);

        gridDiv.style.width = totalWidth + 'px';
        gridDiv.style.height = totalHeight + 'px';

        console.log(`Grid created: ${totalWidth}x${totalHeight}px with ${noteCount} notes`);
        console.log('Grid element:', gridDiv);

        if (this.el) {
            this.el.appendChild(gridDiv);
            console.log('Grid appended to container:', this.el);
        } else {
            console.error('Container element not found!');
        }
    }

    changeSel(start, end) {
        const startX = this.timeToX(start);
        const endX = this.timeToX(end);
        
        this.start = start;
        this.end = end;
        
        if (this.selection) {
            this.selection.style.left = startX + 'px';
            this.selection.style.width = (endX - startX) + 'px';
            this.selection.style.top = '0px';
            this.selection.style.height = this.height + 'px';
        }
    }

    timeToX(time) {
        // Get the converter's low time for proper offset
        const lowTime = this.props.converter ? this.props.converter.lowTicks : 0;
        return Math.round((time - lowTime) * this.scaling) + this.insetX;
    }

    xToTime(x) {
        // Get the converter's low time for proper offset
        const lowTime = this.props.converter ? this.props.converter.lowTicks : 0;
        return ((x - this.insetX) / this.scaling) + lowTime;
    }

    bounds() {
        return this.el ? this.el.getBoundingClientRect() : { left: 0, top: 0 };
    }

    getSelection() {
        // The selection times are already in absolute time coordinates
        // because timeToX and xToTime handle the lowTicks offset
        return {
            start: this.start,
            end: this.end
        };
    }

    render() {
        return React.createElement('div', {
            ref: el => this.el = el
        }, ' ');
    }
}

/**
 * Interactive MIDI Visualizer with drag selection
 */
export class MidiVisualizer extends Component {
    constructor(props) {
        super(props);
        this.plot = null;
    }

    handleMouseDown = (e) => {
        this.beginDrag(e);
    };

    beginDrag(e) {
        const self = this;
        const bounds = this.plot.bounds();
        let isDragging = false;
        let startTime = 0;
        let endTime = 0;

        const handleMouseMove = (e) => {
            if (isDragging) {
                const x = e.clientX - bounds.left;
                endTime = self.plot.xToTime(x);
                
                let selStart = startTime;
                let selEnd = endTime;
                
                if (endTime < startTime) {
                    selStart = endTime;
                    selEnd = startTime;
                }
                
                self.plot.changeSel(selStart, selEnd);
            }
        };

        const handleMouseUp = (e) => {
            isDragging = false;
            
            // If no drag occurred, clear selection
            if (startTime === endTime) {
                self.plot.changeSel(0, 0);
            }
            
            // Notify parent of selection change
            if (self.props.onTimeRangeSelect) {
                const selection = self.plot.getSelection();
                self.props.onTimeRangeSelect(selection);
            }

            // Remove event listeners
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };

        // Initialize drag
        const startDrag = (e) => {
            const x = e.clientX - bounds.left;
            startTime = self.plot.xToTime(x);
            endTime = startTime;
            isDragging = true;

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('touchmove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchend', handleMouseUp);
        };

        startDrag(e);
    }

    getSelectedTimes() {
        return this.plot ? this.plot.getSelection() : { start: 0, end: 0 };
    }

    render() {
        return React.createElement('div', {
            onMouseDown: this.handleMouseDown,
            className: 'midi-visualizer'
        }, React.createElement(MidiGrid, {
            ref: plot => this.plot = plot,
            track: this.props.track,
            converter: this.props.converter
        }));
    }
}