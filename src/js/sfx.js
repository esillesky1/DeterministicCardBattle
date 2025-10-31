class SFXManager {
    constructor() {
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.5;
        this.music = null;
        this.musicVolume = 0.3;
        this.musicEnabled = true;
    }

    /**
     * Load a sound effect
     * @param {string} name - The name/key for the sound
     * @param {string} path - Path to the audio file
     */
    loadSound(name, path) {
        if (this.sounds.has(name)) {
            console.warn(`Sound ${name} is already loaded`);
            return;
        }

        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.volume;
        
        this.sounds.set(name, audio);
    }

    /**
     * Play a sound effect
     * @param {string} name - The name/key of the sound to play
     * @param {Object} options - Optional settings (volume, duration in milliseconds, startTime in seconds, etc.)
     */
    play(name, options = {}) {
        if (!this.enabled) return;

        const sound = this.sounds.get(name);
        if (!sound) {
            console.warn(`Sound ${name} not found`);
            return;
        }

        const audio = sound.cloneNode();
        
        // Set start time to skip blank space at the beginning
        if (options.startTime !== undefined && options.startTime > 0) {
            audio.currentTime = options.startTime;
        } else {
            audio.currentTime = 0;
        }
        
        // Apply volume: options.volume is a multiplier (0.0 to 1.0) of the global volume
        if (options.volume !== undefined) {
            audio.volume = Math.max(0, Math.min(1, this.volume * options.volume));
        } else {
            audio.volume = this.volume;
        }

        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn(`Failed to play sound ${name}:`, error);
            });
        }

        // Stop the sound after specified duration if provided
        if (options.duration !== undefined && options.duration > 0) {
            setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
            }, options.duration);
        }
    }

    /**
     * Set the master volume (0.0 to 1.0)
     * @param {number} volume - Volume level between 0 and 1
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.sounds.forEach(sound => {
            sound.volume = this.volume;
        });
    }

    /**
     * Enable or disable sound effects
     * @param {boolean} enabled - Whether sound effects should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Check if sound effects are enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Load and setup background music
     * @param {string} path - Path to the music file
     */
    loadMusic(path) {
        this.music = new Audio(path);
        this.music.preload = 'auto';
        this.music.loop = false; // We'll handle looping manually for seamless playback
        this.music.volume = this.musicVolume;
        
        // Seamless loop: restart before the audio ends
        this.music.addEventListener('timeupdate', () => {
            if (this.music && this.musicEnabled && !this.music.paused) {
                // If we're within 0.1 seconds of the end, restart
                const timeRemaining = this.music.duration - this.music.currentTime;
                if (timeRemaining <= 0.1 && this.music.duration > 0) {
                    this.music.currentTime = 0;
                }
            }
        });
        
        // Fallback: handle ended event
        this.music.addEventListener('ended', () => {
            if (this.musicEnabled && this.music) {
                this.music.currentTime = 0;
                const playPromise = this.music.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn('Failed to loop background music:', error);
                    });
                }
            }
        });
    }

    /**
     * Play background music
     */
    playMusic() {
        if (!this.musicEnabled || !this.music) return;
        
        // If already playing, don't restart
        if (!this.music.paused) return;
        
        const playPromise = this.music.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn('Failed to play background music:', error);
            });
        }
    }

    /**
     * Pause background music
     */
    pauseMusic() {
        if (this.music) {
            this.music.pause();
        }
    }

    /**
     * Stop background music and reset to beginning
     */
    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
    }

    /**
     * Set background music volume (0.0 to 1.0)
     * @param {number} volume - Volume level between 0 and 1
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }

    /**
     * Enable or disable background music
     * @param {boolean} enabled - Whether music should be enabled
     */
    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        if (!enabled && this.music) {
            this.pauseMusic();
        } else if (enabled && this.music) {
            this.playMusic();
        }
    }
}

// Create global SFX manager instance
const sfx = new SFXManager();

// Initialize default sounds
sfx.loadSound('damage', 'sfx/damage.flac');
sfx.loadSound('attack', 'sfx/attack.wav');
sfx.loadSound('cardShuffle', 'sfx/card-shuffle.wav');
sfx.loadSound('drawCard', 'sfx/draw-card.mp3');
sfx.loadSound('placeCard', 'sfx/place-card.wav');
sfx.loadSound('sine', 'sfx/sine.wav');
sfx.loadSound('unsheath', 'sfx/unsheath.wav');
sfx.loadSound('smallUnsheath', 'sfx/small-unsheath.wav');
sfx.loadSound('manaGain', 'sfx/mana-gain.wav');
sfx.loadSound('woosh', 'sfx/woosh.wav');
sfx.loadSound('death', 'sfx/death.wav');
sfx.loadSound('sigh', 'sfx/sigh.wav');
sfx.loadSound('bubbleBoing', 'sfx/bubble-boing.wav');
sfx.loadSound('homeExplode', 'sfx/home-explode.wav');
sfx.loadSound('applause', 'sfx/applause.wav');
sfx.loadSound('fanfare', 'sfx/fanfare.wav');
sfx.loadSound('demonDeath', 'sfx/demon-death.wav');
sfx.loadSound('noDraw', 'sfx/no-draw.wav');

// Load background music
sfx.loadMusic('sfx/music-loop.mp3');

