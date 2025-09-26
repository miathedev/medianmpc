
import React from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

export class MidiPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isPlaying: false };
    this.synth = null;
    this.timeoutId = null;
    this.midi = null;
    this.loadedBuffer = null;
  }

  playTrack = async () => {
    const { midiArrayBuffer, trackIndex, toneTrack, toneMidi } = this.props;

    let track = toneTrack || null;

    // If no tone track provided, fall back to parsing by index
    if (!track) {
      if (!midiArrayBuffer || trackIndex == null) {
        console.warn('MidiPlayer: Missing toneTrack and midiArrayBuffer.');
        return;
      }

      if (this.loadedBuffer !== midiArrayBuffer) {
        try {
          this.midi = new Midi(midiArrayBuffer);
          this.loadedBuffer = midiArrayBuffer;
        } catch (error) {
          console.error('MidiPlayer: Failed to parse MIDI buffer', error);
          return;
        }
      }

      const sourceMidi = toneMidi || this.midi;
      if (!sourceMidi) {
        console.warn('MidiPlayer: No MIDI data available for playback.');
        return;
      }

      track = sourceMidi.tracks?.[trackIndex] || null;

      if (!track || !track.notes || track.notes.length === 0) {
        // Attempt to align by filtering to tracks with notes when direct index lookup fails
        const fallbackTracks = sourceMidi.tracks?.filter(t => t.notes && t.notes.length > 0) || [];
        track = fallbackTracks[trackIndex] || fallbackTracks[0] || null;
      }
    }

    if (!track || !track.notes || track.notes.length === 0) {
      console.warn('MidiPlayer: Selected track has no playable notes.');
      return;
    }

    // Ensure previous playback is stopped before starting a new one
    this.stopTrack(true);

    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;

    // Create a synth for playback
    this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    this.setState({ isPlaying: true });

    const now = Tone.now();

    // Schedule notes for the selected track only
    track.notes.forEach(note => {
      const startTime = now + (note.time || 0);
      const velocity = typeof note.velocity === 'number'
        ? note.velocity
        : (note.velocity ? parseFloat(note.velocity) : 0.7);
      const duration = Math.max(note.duration || 0, 0.01);
      this.synth.triggerAttackRelease(note.name, duration, startTime, velocity);
    });

    // Start Tone Transport immediately
    Tone.Transport.start();

    // Determine track duration (fallback to max note end time when unavailable)
    const trackDuration = typeof track.duration === 'number' && !Number.isNaN(track.duration)
      ? track.duration
      : track.notes.reduce((max, note) => Math.max(max, (note.time || 0) + (note.duration || 0)), 0);

    // Stop after track duration
    this.timeoutId = setTimeout(() => {
      this.stopTrack();
    }, trackDuration * 1000 + 500);
  };

  stopTrack = (keepState = false) => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    if (this.synth) {
      this.synth.releaseAll();
      this.synth.dispose();
      this.synth = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (!keepState) {
      this.setState({ isPlaying: false });
    }
  };

  componentWillUnmount() {
    this.stopTrack();
  }

  render() {
    return (
      <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
        <button
          className="mpc-button midi-play-btn"
          style={{ padding: '8px 16px', background: '#007bff', fontSize: 14 }}
          onClick={this.playTrack}
          disabled={this.state.isPlaying}
        >
          {this.state.isPlaying ? 'Playing...' : 'Play'}
        </button>
        <button
          className="clear-selection-button midi-stop-btn"
          style={{ padding: '8px 16px', fontSize: 14 }}
          onClick={this.stopTrack}
          disabled={!this.state.isPlaying}
        >
          Stop
        </button>
      </span>
    );
  }
}
