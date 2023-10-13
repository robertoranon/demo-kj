// ThreeJS and Third-party deps
import * as THREE from 'three';
import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';
import {
  SSGIEffect,
  TRAAEffect,
  MotionBlurEffect,
  VelocityDepthNormalPass,
} from 'realism-effects';
import { NormalPass, SSAOEffect, EffectPass } from 'postprocessing';

// Core boilerplate code deps
import {
  createCamera,
  createComposer,
  createRenderer,
  runApp,
  computeWorldBounds,
} from './core-utils';

global.THREE = THREE;
// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
THREE.ColorManagement.enabled = true;

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
};

/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene();

const sceneParams = {
  backgroundBlur: 0.5,
  backgroundIntensity: 1,
  envMapIntensity: 2
};

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
  // https://threejs.org/docs/#manual/en/introduction/Color-management
  _renderer.outputColorSpace = THREE.SRGBColorSpace;
});

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(35, 0.1, 200, { x: 0, y: 5, z: 15 });
window.camera = camera;

// (Optional) Create the EffectComposer and passes for post-processing
// If you don't need post-processing, just comment/delete the following creation code, and skip passing any composer to 'runApp' at the bottom
// The RenderPass is already created in 'createComposer'
let composer = createComposer(renderer, scene, camera, (comp) => {
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
  comp.addPass(normalPass);
  comp.addPass(effectPass);
});

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.maxDistance = 4;
    this.controls.enableDamping = true;
    this.controls.target.y = 0.5;
    // GUI controls
    const gui = new dat.GUI();

    gui
      .add(sceneParams, 'envMapIntensity', 0, 5)
      .onChange(() => this.updateMaterials());
    gui
      .add(sceneParams, 'backgroundBlur', 0, 1)
      .onChange(() => this.updateMaterials());
    gui
      .add(sceneParams, 'backgroundIntensity', 0, 5)
      .onChange(() => this.updateMaterials());

    // Stats - show fps
    this.stats1 = new Stats();
    this.stats1.showPanel(0); // Panel 0 = fps
    this.stats1.domElement.style.cssText =
      'position:absolute;top:0px;left:0px;';
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement);

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    // directionalLight.castShadow = true;
    // directionalLight.position.set(1, 0.8, 0.5);
    // scene.add(directionalLight);

    return new RGBELoader().load('royal_esplanade_1k.hdr', function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;

      //scene.background = new THREE.Color(0xcccccc);
      scene.background = texture;
      scene.backgroundBlurriness = sceneParams.backgroundBlur;
      scene.backgroundIntensity = sceneParams.backgroundIntensity;
      scene.environment = texture;

      // model

      const loader = new GLTFLoader();
      loader.load('Lampadario.glb', function (gltf) {
        gltf.scene.traverse(function (child) {
          if (child.isMesh) {
            child.material.envMapIntensity = 2;
          }
        });

        scene.add(gltf.scene);
        // computeWorldBounds(gltf.scene);
        // console.log(gltf.scene.boundingBox);
      });
    });
  },

  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update();
    this.stats1.update();
  },

  updateMaterials() {
    scene.backgroundBlurriness = sceneParams.backgroundBlur;
    scene.backgroundIntensity = sceneParams.backgroundIntensity;

    scene.traverse(function (child) {
      if (child.isMesh) {
        child.material.envMapIntensity = sceneParams.envMapIntensity;

      }
    });
  },
};

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, undefined, undefined);
