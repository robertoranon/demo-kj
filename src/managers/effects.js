import { Vector2 } from 'three';
// Addons
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { bloomParams } from '../params';

export class PPEffectsManager {
    constructor() {
        // Differents Effects
        this.bloomPass = new UnrealBloomPass(
            new Vector2(window.innerWidth, window.innerHeight),
            bloomParams.strength,
            bloomParams.radius,
            bloomParams.threshold
        );
    }
}
