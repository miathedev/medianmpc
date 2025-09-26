
import React from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

export class MidiPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isPlaying: false };
    this.synth = null;
    this.timeoutId = null;
  }

  playTrack = async () => {
    const { midiArrayBuffer, trackIndex } = this.props;
    if (!midiArrayBuffer || trackIndex == null) return;

    // Parse MIDI
    const midi = new Midi(midiArrayBuffer);
    const track = midi.tracks[trackIndex];
    if (!track) return;

    // Create a synth for playback
    this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    await Tone.start();
    this.setState({ isPlaying: true });

    // Schedule notes
    track.notes.forEach(note => {
      this.synth.triggerAttackRelease(note.name, note.duration, note.time, note.velocity);
    });

    // Start Tone Transport
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    Tone.Transport.start();

    // Stop after track duration
    this.timeoutId = setTimeout(() => {
      this.stopTrack();
    }, track.duration * 1000 + 500);
  };

  stopTrack = () => {
    Tone.Transport.stop();
    if (this.synth) {
      this.synth.releaseAll();
      this.synth.dispose();
      this.synth = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.setState({ isPlaying: false });
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
