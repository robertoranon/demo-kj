import {
    ColorManagement,
    Scene,
    SRGBColorSpace,
    EquirectangularReflectionMapping,
    Color,
    Clock,
    AnimationMixer,
} from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

// Core boilerplate code deps
import {
    createCamera,
    createComposer,
    createRenderer,
    getDefaultUniforms,
} from '../utils/core';

import { handleFileDrop, blobFileTransformer } from '../utils/drag-drop';
import { PaneManager } from './pane';
import { PPEffectsManager } from './effects';

class SceneManager {
    constructor(container) {
        this.scene = new Scene();
        this.modelLoader = new GLTFLoader();
        this.rgbeLoader = new RGBELoader();
        this.pane = new PaneManager('#tweakContainer', 'Model Scene Controls');
        this.effectsManager = new PPEffectsManager();
        this.container = container;

        ColorManagement.enabled = true;

        this.renderer = createRenderer({ antialias: true }, _renderer => {
            // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
            // https://threejs.org/docs/#manual/en/introduction/Color-management
            _renderer.outputColorSpace = SRGBColorSpace;
        });

        this.camera = createCamera(35, 0.1, 200, { x: 0, y: 0, z: 15 });
        this.clock = new Clock();
        this.mixer = undefined;

        // OrbitControls
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );

        // If you don't need post-processing, just comment/delete the following creation code, and skip passing any composer to 'runApp' at the bottom
        // The RenderPass is already created in 'createComposer'
        this.composer = createComposer(
            this.renderer,
            this.scene,
            this.camera,
            comp => {
                this.pane.sceneParams.bloom ? comp.addPass(bloomPass) : null;
            }
        );

        this.animationBinder = this.animate.bind(this);
        this.requestAnimationID = null;

        this.setupPaneControls();
    }

    setupPaneControls() {
        this.pane.sceneParamsFolder
            .addBinding(this.pane.sceneParams, 'envMapIntensity', {
                min: 0,
                max: 4,
            })
            .on('change', () => this.updateMaterials());

        this.pane.sceneParamsFolder
            .addBinding(this.pane.sceneParams, 'bloom', {
                label: 'Model Bloom effect',
            })
            .on('change', e => {
                this.tweakComposerEffects(e, this.effectsManager.bloomPass);
                this.pane.bloomParamsFolder.disabled =
                    !this.pane.bloomParamsFolder.disabled;
            });

        this.pane.sceneParamsFolder
            .addBinding(this.pane.sceneParams, 'light_bloom', {
                label: 'Lights Bloom effect',
            })
            .on('change', e => {
                // this.tweakComposerEffects(e, bloomPass);
                this.pane.bloomParamsFolder.disabled =
                    !this.pane.bloomParamsFolder.disabled;
            });

        this.pane.bloomParamsFolder
            .addBinding(this.pane.bloomParams, 'threshold', {
                min: 0,
                max: 1,
            })
            .on(
                'change',
                e => (this.effectsManager.bloomPass.threshold = Number(e.value))
            );

        this.pane.bloomParamsFolder
            .addBinding(this.pane.bloomParams, 'strength', { min: 0, max: 3 })
            .on(
                'change',
                e => (this.effectsManager.bloomPass.strength = Number(e.value))
            );

        this.pane.bloomParamsFolder
            .addBinding(this.pane.bloomParams, 'radius', { min: 0, max: 3 })
            .on(
                'change',
                e => (this.effectsManager.bloomPass.radius = Number(e.value))
            );

        this.pane.bloomParamsFolder
            .addBinding(this.pane.bloomParams, 'exposure', { min: 0, max: 3 })
            .on(
                'change',
                e =>
                    (this.renderer.toneMappingExposure = Math.pow(e.value, 4.0))
            );

        const hdr = this.pane.sceneParamsFolder
            .addBinding(this.pane.sceneParams, 'hdr', {
                options: this.pane.hdrList,
            })
            .on('change', e => this.updateHDR(e.value));
    }

    setupScene = async () => {
        this.container.appendChild(this.renderer.domElement);
        const uniforms = getDefaultUniforms();

        // Register resize listener
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            // update uniforms.u_resolution
            if (uniforms.u_resolution !== undefined) {
                uniforms.u_resolution.value.x =
                    window.innerWidth * window.devicePixelRatio;
                uniforms.u_resolution.value.y =
                    window.innerHeight * window.devicePixelRatio;
            }
        });

        this.container.addEventListener('drop', e => {
            e.preventDefault();

            const file = handleFileDrop(e);
            const { name, blob, extension } = blobFileTransformer(file);

            if (extension === 'hdr') {
                this.updateHDR(blob);
                this.updateHDRList(name.split('.')[0], blob);
                return;
            }

            if (extension === 'glb') {
                this.updateModel(blob);
                return;
            }
        });

        this.container.addEventListener('dragover', e => {
            e.preventDefault();
        });

        // Register mouse move/touch listener
        const mouseListener = e => {
            uniforms.u_mouse.value.x = e.touches
                ? e.touches[0].clientX
                : e.clientX;
            uniforms.u_mouse.value.y = e.touches
                ? e.touches[0].clientY
                : e.clientY;
        };
        if ('ontouchstart' in window) {
            window.addEventListener('touchmove', mouseListener);
        } else {
            window.addEventListener('mousemove', mouseListener);
        }

        await this.initScene();
        this.animate();
    };

    async initScene() {
        this.controls.maxDistance = 5;
        this.controls.enableDamping = true;

        const self = this;

        this.rgbeLoader.load(
            Object.values(self.pane.hdrList)[0],
            function (texture) {
                texture.mapping = EquirectangularReflectionMapping;
                self.scene.background = new Color(0x000000);
                // self.background = texture;
                self.scene.backgroundBlurriness =
                    self.pane.sceneParams.backgroundBlur;
                self.scene.backgroundIntensity =
                    self.pane.sceneParams.backgroundIntensity;
                self.scene.environment = texture;

                self.modelLoader.load('Lampadario.glb', function (gltf) {
                    gltf.scene.traverse(function (child) {
                        if (child.isMesh) {
                            child.material.envMapIntensity =
                                self.pane.sceneParams.envMapIntensity;
                        }
                    });

                    self.mixer = new AnimationMixer(gltf.scene);
                    self.scene.add(gltf.scene);
                });
            }
        );
    }

    // The engine that powers your scene into movement
    animate() {
        this.pane.fpsGraph.begin();

        const delta = this.clock.getDelta();
        this.requestAnimationID = requestAnimationFrame(this.animationBinder);

        this.mixer.update(delta);

        this.controls.update();

        this.pane.fpsGraph.end();

        if (this.composer === null) {
            this.renderer.render(this.scene, this.camera);
        } else {
            this.composer.render();
        }
    }

    updateMaterials = () => {
        const self = this;

        this.scene.backgroundBlurriness = this.pane.sceneParams.backgroundBlur;
        this.scene.backgroundIntensity =
            this.pane.sceneParams.backgroundIntensity;

        this.scene.traverse(function (child) {
            if (child.isMesh) {
                child.material.envMapIntensity =
                    self.pane.sceneParams.envMapIntensity;
            }
        });
    };

    updateModel = modelName => {
        this.scene.remove(this.scene.children[0]);
        const self = this;

        this.modelLoader.load(modelName, function (gltf) {
            gltf.scene.traverse(function (child) {
                if (child.isMesh) {
                    child.material.envMapIntensity =
                        self.pane.sceneParams.envMapIntensity;
                }
            });

            self.scene.add(gltf.scene);
        });
    };

    updateHDR = filename => {
        const self = this;

        this.rgbeLoader.load(filename, texture => {
            texture.mapping = EquirectangularReflectionMapping;
            self.scene.environment = texture;
        });
    };

    updateHDRList = (filename, hdrUrl) => {
        this.hdr.options = [
            ...this.hdr.options,
            { text: filename, value: hdrUrl },
        ];
    };

    tweakComposerEffects = (e, effect) => {
        const value = e.value;
        value
            ? this.composer.insertPass(effect, this.composer.passes.length - 1)
            : this.composer.removePass(effect);
    };
}

export { SceneManager };
