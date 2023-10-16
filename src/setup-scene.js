// ThreeJS and Third-party deps
import {
    ColorManagement,
    Scene,
    SRGBColorSpace,
    EquirectangularReflectionMapping,
    Color,
} from 'three';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

import {
    NormalPass,
    SSAOEffect,
    EffectPass,
    BloomEffect,
} from 'postprocessing';

// Core boilerplate code deps
import {
    createCamera,
    createComposer,
    createRenderer,
    computeWorldBounds,
} from './core-utils';

// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
ColorManagement.enabled = true;

// Create the scene
let scene = new Scene();

const modelLoader = new GLTFLoader();
const rgbeLoader = new RGBELoader();

let hdrList = {
    hdri_lampadario_05: 'hdri_lampadario_05.hdr',
    royal_esplanade_1k: 'royal_esplanade_1k.hdr',
};

const sceneParams = {
    backgroundBlur: 0.5,
    backgroundIntensity: 1,
    envMapIntensity: 1,
    effect: false,
    bloom: false,
    hdr: Object.values(hdrList)[0],
};

const pane = new Pane({
    container: document.querySelector('#tweakContainer'),
    title: 'Model Pane',
});

pane.registerPlugin(EssentialsPlugin);

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, _renderer => {
    // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
    // https://threejs.org/docs/#manual/en/introduction/Color-management
    _renderer.outputColorSpace = SRGBColorSpace;
});

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(35, 0.1, 200, { x: 0, y: 0, z: 15 });

// If you don't need post-processing, just comment/delete the following creation code, and skip passing any composer to 'runApp' at the bottom
// The RenderPass is already created in 'createComposer'
let composer = createComposer(renderer, scene, camera, () => {});

// Differents Effects
const normalPass = new NormalPass(scene, camera);
const effect = new SSAOEffect(camera, normalPass.texture, {
    worldDistanceThreshold: 100,
    worldDistanceFalloff: 5,
    worldProximityThreshold: 10,
    worldProximityFalloff: 0.1,
    luminanceInfluence: 0.7,
    samples: 16,
    radius: 0.1,
    intensity: 3,
    resolutionScale: 1,
});

const effectPass = new EffectPass(camera, effect);
const bloomPass = new EffectPass(camera, new BloomEffect());

const updateMaterials = () => {
    scene.backgroundBlurriness = sceneParams.backgroundBlur;
    scene.backgroundIntensity = sceneParams.backgroundIntensity;

    scene.traverse(function (child) {
        if (child.isMesh) {
            child.material.envMapIntensity = sceneParams.envMapIntensity;
        }
    });
};

const updateModel = modelName => {
    scene.remove(scene.children[0]);
    modelLoader.load(modelName, function (gltf) {
        gltf.scene.traverse(function (child) {
            if (child.isMesh) {
                child.material.envMapIntensity = sceneParams.envMapIntensity;
            }
        });

        scene.add(gltf.scene);
    });
};

const updateHDR = filename => {
    rgbeLoader.load(filename, texture => {
        texture.mapping = EquirectangularReflectionMapping;
        scene.environment = texture;
    });
};

const updateHDRList = (filename, hdrUrl) => {
    hdr.options = [...hdr.options, { text: filename, value: hdrUrl }];
};

const tweakComposerEffects = (e, effect) => {
    const value = e.value;
    value ? composer.addPass(effect) : composer.removePass(effect);
};

const fpsGraph = pane.addBlade({
    view: 'fpsgraph',
    label: 'fpsgraph',
    rows: 2,
});

pane.addBinding(sceneParams, 'envMapIntensity', {
    min: 0,
    max: 4,
}).on('change', () => updateMaterials());

pane.addBinding(sceneParams, 'backgroundBlur', {
    min: 0,
    max: 1,
}).on('change', () => updateMaterials());

pane.addBinding(sceneParams, 'backgroundIntensity', {
    min: 0,
    max: 5,
}).on('change', () => updateMaterials());

pane.addBinding(sceneParams, 'effect').on('change', e =>
    tweakComposerEffects(e, effectPass)
);

pane.addBinding(sceneParams, 'bloom').on('change', e =>
    tweakComposerEffects(e, bloomPass)
);

const hdr = pane
    .addBinding(sceneParams, 'hdr', {
        options: hdrList,
    })
    .on('change', e => updateHDR(e.value));

let app = {
    async initScene() {
        // OrbitControls
        this.controls = new OrbitControls(camera, renderer.domElement);
        this.controls.maxDistance = 4;
        this.controls.enableDamping = true;
        this.controls.target.y = 0.5;

        rgbeLoader.load(Object.values(hdrList)[0], function (texture) {
            texture.mapping = EquirectangularReflectionMapping;
            scene.background = new Color(0x000000);
            // scene.background = texture;
            scene.backgroundBlurriness = sceneParams.backgroundBlur;
            scene.backgroundIntensity = sceneParams.backgroundIntensity;
            scene.environment = texture;

            modelLoader.load('Lampadario.glb', function (gltf) {
                gltf.scene.traverse(function (child) {
                    if (child.isMesh) {
                        child.material.envMapIntensity =
                            sceneParams.envMapIntensity;
                    }
                });

                scene.add(gltf.scene);
            });
        });
    },

    // @param {number} interval - time elapsed between 2 frames
    // @param {number} elapsed - total time elapsed since app start
    updateScene(interval, elapsed) {
        fpsGraph.begin();
        this.controls.update();
        fpsGraph.end();
    },
};

export {
    app,
    scene,
    renderer,
    camera,
    composer,
    updateHDR,
    updateHDRList,
    updateModel,
};
