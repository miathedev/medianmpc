
import React from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

const INSTRUMENT_PROFILES = {
  piano: {
    voiceOptions: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.25, sustain: 0.4, release: 1.5 },
    },
    volume: -6,
  },
  organ: {
    voiceOptions: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.9, release: 1.0 },
    },
    volume: -8,
  },
  guitar: {
    voiceOptions: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.35, sustain: 0.3, release: 1.6 },
    },
    volume: -10,
  },
  bass: {
    voiceOptions: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 },
    },
    volume: -4,
  },
  strings: {
    voiceOptions: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 2.0 },
    },
    volume: -8,
  },
  brass: {
    voiceOptions: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 1.4 },
    },
    volume: -6,
  },
  reed: {
    voiceOptions: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0.5, release: 1.2 },
    },
    volume: -8,
  },
  pipe: {
    voiceOptions: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.6, release: 1.3 },
    },
    volume: -10,
  },
  lead: {
    voiceOptions: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 1.0 },
    },
    volume: -6,
  },
  pad: {
    voiceOptions: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.3, decay: 0.4, sustain: 0.7, release: 2.8 },
    },
    volume: -12,
  },
  percussion: {
    voiceOptions: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.09, sustain: 0.0, release: 0.25 },
    },
    volume: -8,
  },
  default: {
    voiceOptions: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
    },
    volume: -6,
  },
};

const mapProgramToFamily = (program) => {
  if (program == null || Number.isNaN(program)) {
    return null;
  }
  if (program <= 7) return 'piano';
  if (program <= 15) return 'percussion';
  if (program <= 23) return 'organ';
  if (program <= 31) return 'guitar';
  if (program <= 39) return 'bass';
  if (program <= 47) return 'strings';
  if (program <= 55) return 'strings';
  if (program <= 63) return 'brass';
  if (program <= 71) return 'reed';
  if (program <= 79) return 'pipe';
  if (program <= 87) return 'lead';
  if (program <= 95) return 'pad';
  if (program <= 103) return 'lead';
  if (program <= 119) return 'percussion';
  return 'percussion';
};

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
    const { midiArrayBuffer, trackIndex, toneTrack, toneMidi, track: midiDocTrack } = this.props;

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

  const profile = this.resolveInstrumentProfile(track, midiDocTrack);
  this.synth = this.createInstrument(profile);
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

  stopTrack = (keepStateOrEvent = false) => {
    const keepState = keepStateOrEvent === true;
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

  resolveInstrumentProfile = (toneTrack, midiDocTrack) => {
    const descriptorParts = [];
    if (toneTrack?.instrument?.family) {
      descriptorParts.push(toneTrack.instrument.family);
    }
    if (toneTrack?.instrument?.name) {
      descriptorParts.push(toneTrack.instrument.name);
    }
    if (midiDocTrack?.instrumentName) {
      descriptorParts.push(midiDocTrack.instrumentName);
    }
    if (midiDocTrack?.name) {
      descriptorParts.push(midiDocTrack.name);
    }
    const descriptor = descriptorParts.join(' ').toLowerCase();

    const channel = typeof toneTrack?.channel === 'number'
      ? toneTrack.channel
      : (typeof midiDocTrack?.channel === 'number' ? midiDocTrack.channel : null);

    const program = typeof toneTrack?.instrument?.number === 'number'
      ? toneTrack.instrument.number
      : (typeof midiDocTrack?.instrument === 'number' ? midiDocTrack.instrument : null);

    const family = this.resolveInstrumentFamily({ descriptor, channel, program });
    return INSTRUMENT_PROFILES[family] || INSTRUMENT_PROFILES.default;
  };

  resolveInstrumentFamily = ({ descriptor, channel, program }) => {
    const label = descriptor || '';
    const normalizedLabel = label.toLowerCase();

    if (typeof channel === 'number' && channel === 9) {
      return 'percussion';
    }

    if (normalizedLabel.includes('drum') || normalizedLabel.includes('percuss')) {
      return 'percussion';
    }
    if (normalizedLabel.includes('piano')) {
      return 'piano';
    }
    if (normalizedLabel.includes('organ')) {
      return 'organ';
    }
    if (normalizedLabel.includes('guitar') || normalizedLabel.includes('gtr')) {
      return 'guitar';
    }
    if (normalizedLabel.includes('bass')) {
      return 'bass';
    }
    if (normalizedLabel.includes('string') || normalizedLabel.includes('violin') || normalizedLabel.includes('cello')) {
      return 'strings';
    }
    if (normalizedLabel.includes('brass') || normalizedLabel.includes('trumpet') || normalizedLabel.includes('trombone') || normalizedLabel.includes('horn')) {
      return 'brass';
    }
    if (normalizedLabel.includes('sax') || normalizedLabel.includes('clarinet') || normalizedLabel.includes('oboe')) {
      return 'reed';
    }
    if (normalizedLabel.includes('flute') || normalizedLabel.includes('pipe') || normalizedLabel.includes('whistle')) {
      return 'pipe';
    }
    if (normalizedLabel.includes('pad') || normalizedLabel.includes('choir') || normalizedLabel.includes('voice') || normalizedLabel.includes('vox')) {
      return 'pad';
    }
    if (normalizedLabel.includes('lead') || normalizedLabel.includes('synth')) {
      return 'lead';
    }

    const programFamily = mapProgramToFamily(program);
    if (programFamily) {
      return programFamily;
    }
    return 'default';
  };

  createInstrument = (profile) => {
    const voiceOptions = profile.voiceOptions || {};
    const volume = typeof profile.volume === 'number' ? profile.volume : -8;
    const poly = new Tone.PolySynth(Tone.Synth, voiceOptions).toDestination();
    poly.volume.value = volume;
    return poly;
  };

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
