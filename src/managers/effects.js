import { Vector2 } from 'three';
// Addons
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class PPEffectsManager {
    constructor() {
        // Differents Effects
        this.bloomPass = new UnrealBloomPass(
            new Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.4,
            0.85
        );
    }
}
