// js/sound.js
// Quiet, short sound cues synthesized with the Web Audio API (no audio files needed).
// Rules: every cue is under ~2 seconds, soft, melody-free, and the whole thing can be muted (M).

const Sound = (() => {
    // ---- saved preferences (safe if localStorage is blocked) ----
    const store = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem('dictation.' + key);
                return v === null ? fallback : v;
            } catch (e) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem('dictation.' + key, value); } catch (e) { /* ignore */ }
        }
    };

    let muted = store.get('muted', '0') === '1';
    let volume = Math.min(1, Math.max(0, Number(store.get('volume', '60')) / 100));
    if (Number.isNaN(volume)) volume = 0.6;
    let ambientOn = store.get('ambient', '0') === '1';

    let ctx = null;
    let master = null;
    let ambient = null;

    function ensure() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = muted ? 0 : volume;
            master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function applyMaster() {
        if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05);
        const chime = document.getElementById('focus-chime');
        if (chime) chime.volume = volume;
    }

    // One soft note: quick fade-in, smooth fade-out
    function tone(freq, opts = {}) {
        if (muted) return;
        const c = ensure();
        if (!c) return;
        const { at = 0, dur = 0.4, gain = 0.25, type = 'sine', to = null } = opts;
        const t = c.currentTime + at;

        const osc = c.createOscillator();
        const env = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);

        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(gain, t + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(env);
        env.connect(master);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }

    // Pentatonic steps for the "spell it" letters
    const SCALE = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99];

    // ---- background: very quiet brown noise (like soft rain / wind) ----
    function ambientStart() {
        if (!ambientOn || ambient) return;
        const c = ensure();
        if (!c) return;

        const len = c.sampleRate * 4;
        const buf = c.createBuffer(1, len, c.sampleRate);
        const data = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            last = (last + 0.02 * white) / 1.02;
            data[i] = last * 3.5;
        }
        // Fade the loop edges so the loop point never clicks
        const edge = Math.floor(c.sampleRate * 0.05);
        for (let i = 0; i < edge; i++) {
            const k = i / edge;
            data[i] *= k;
            data[len - 1 - i] *= k;
        }

        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 700;
        const g = c.createGain();
        g.gain.setValueAtTime(0, c.currentTime);
        g.gain.linearRampToValueAtTime(0.22, c.currentTime + 2.5);

        src.connect(lp);
        lp.connect(g);
        g.connect(master);
        src.start();
        ambient = { src, g };
    }

    function ambientStop() {
        if (!ambient || !ctx) return;
        const { src, g } = ambient;
        ambient = null;
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
        setTimeout(() => { try { src.stop(); } catch (e) { /* already stopped */ } }, 1400);
    }

    return {
        isMuted: () => muted,
        getVolume: () => volume,
        isAmbientOn: () => ambientOn,

        setMuted(value) {
            muted = !!value;
            store.set('muted', muted ? '1' : '0');
            applyMaster();
        },
        setVolume(value) {   // 0..1
            volume = Math.min(1, Math.max(0, value));
            store.set('volume', String(Math.round(volume * 100)));
            applyMaster();
        },
        setAmbientEnabled(value) {
            ambientOn = !!value;
            store.set('ambient', ambientOn ? '1' : '0');
            if (!ambientOn) ambientStop();
        },
        ambientStart,
        ambientStop,

        // ---- cues ----
        chime() {                                   // start of dictation (existing recording)
            const el = document.getElementById('focus-chime');
            if (!el || muted) return;
            el.volume = volume;
            el.currentTime = 0;
            el.play().catch(() => {});
        },
        word() {                                    // next word appears
            tone(523.25, { dur: 0.45, gain: 0.26 });
            tone(1046.5, { dur: 0.25, gain: 0.05 });
        },
        low() { tone(329.63, { dur: 0.7, gain: 0.2 }); },       // 5 seconds left
        pause() { tone(440, { to: 330, dur: 0.35, gain: 0.2 }); },
        resume() { tone(330, { to: 440, dur: 0.35, gain: 0.2 }); },
        pencilsDown() {
            [659.25, 523.25, 392.0].forEach((f, i) => tone(f, { at: i * 0.28, dur: 0.8, gain: 0.2 }));
        },
        tick() { tone(900, { dur: 0.05, gain: 0.1, type: 'triangle' }); },   // roller step
        land() {                                                              // roller stops
            tone(523.25, { dur: 1.0, gain: 0.22 });
            tone(783.99, { at: 0.02, dur: 1.0, gain: 0.15 });
        },
        answer() {
            tone(880, { dur: 0.5, gain: 0.13 });
            tone(1318.5, { at: 0.08, dur: 0.6, gain: 0.08 });
        },
        letter(i) {                                 // one note per spelled letter
            const octave = Math.floor(i / SCALE.length) % 2 === 0 ? 1 : 2;
            tone(SCALE[i % SCALE.length] * octave, { dur: 0.3, gain: 0.16 });
        },
        finish() {                                  // end of the checking
            [261.63, 329.63, 392.0, 523.25].forEach((f, i) =>
                tone(f, { at: i * 0.07, dur: 1.7, gain: 0.13 }));
        },
        preview() { tone(523.25, { dur: 0.35, gain: 0.22 }); }   // volume slider feedback
    };
})();
