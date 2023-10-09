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

let nM = new THREE.TextureLoader().load('normal.png');

const sceneParams = {
  backgroundBlur: 0.5,
  backgroundIntensity: 1,
  doubleSided: true,
  redColor: 0xff0000,
  greenColor: 0x00ff00,
  transparentColor: 0xffffff,
};

const materialParams = {
  transmission: 0.9,
  color: 0xffffff,
  roughness: 0.05,
  thickness: 0.1,
  ior: 1.5,
  envMapIntensity: 2,
  opacity: 1,
  transparent: true,
  side: THREE.DoubleSide,
  //attenuationDistance: 0.001,
};

let materials = {
  vetroRossoX: new THREE.MeshPhysicalMaterial({
    ...materialParams,
    color: sceneParams.redColor,
    attenuationColor: new THREE.Color(sceneParams.redColor),
  }),
  vetroRossoXRigato: new THREE.MeshPhysicalMaterial({
    ...materialParams,
    normalMap: nM,
    color: sceneParams.redColor,
    attenuationColor: new THREE.Color(sceneParams.redColor),
  }),
  vetroTrasparente: new THREE.MeshPhysicalMaterial({
    ...materialParams,
    attenuationColor: new THREE.Color(sceneParams.transparentColor),
  }),
  vetroTrasparenteRigato: new THREE.MeshPhysicalMaterial({
    ...materialParams,
    normalMap: nM,
    attenuationColor: new THREE.Color(sceneParams.transparentColor),
  }),
  vetroVerdeX: new THREE.MeshPhysicalMaterial({
    ...materialParams,
    color: sceneParams.greenColor,
    attenuationColor: new THREE.Color(sceneParams.greenColor),
  }),
  vetroVerdeXRigato: new THREE.MeshPhysicalMaterial({
    ...materialParams,
    normalMap: nM,
    color: sceneParams.greenColor,
    attenuationColor: new THREE.Color(sceneParams.greenColor),
  }),
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
    gui.addColor(sceneParams, 'redColor').onChange(() => {
      materials.vetroRossoX.color.set(sceneParams.redColor);
      materials.vetroRossoXRigato.color.set(sceneParams.redColor);
    });
    gui.addColor(sceneParams, 'transparentColor').onChange(() => {
      materials.vetroTrasparente.color.set(sceneParams.transparentColor);
      materials.vetroTrasparenteRigato.color.set(sceneParams.transparentColor);
    });
    gui.addColor(sceneParams, 'greenColor').onChange(() => {
      materials.vetroVerdeX.color.set(sceneParams.greenColor);
      materials.vetroVerdeXRigato.color.set(sceneParams.greenColor);
    });

    gui
      .add(materialParams, 'transmission', 0.01, 1)
      .onChange(() => this.updateMaterials());
    gui
      .add(materialParams, 'roughness', 0, 1)
      .onChange(() => this.updateMaterials());
    gui.add(materialParams, 'ior', 1, 2).onChange(() => this.updateMaterials());
    gui
      .add(materialParams, 'thickness', 0, 5)
      .onChange(() => this.updateMaterials());
    // gui
    //   .add(materialParams, 'attenuationDistance', 0.0001, 0.1)
    //   .onChange(() => this.updateMaterials());
    gui
      .add(materialParams, 'opacity', 0, 1)
      .onChange(() => this.updateMaterials());

    gui
      .add(materialParams, 'envMapIntensity', 0, 5)
      .onChange(() => this.updateMaterials());
    gui.add(sceneParams, 'doubleSided').onChange(() => this.updateMaterials());
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

            if (child.material.name === 'vetro_rossox') {
              if (child.name.includes('rigato')) {
                child.material = materials.vetroRossoXRigato;
              } else {
                child.material = materials.vetroRossoX;
              }
            }

            if (child.material.name === 'vetro_trasparente') {
              if (child.name.includes('rigato')) {
                child.material = materials.vetroTrasparenteRigato;
              } else {
                child.material = materials.vetroTrasparente;
              }
            }

            if (child.material.name === 'vetro_verdex') {
              if (child.name.includes('rigato')) {
                child.material = materials.vetroVerdeXRigato;
              } else {
                child.material = materials.vetroVerdeX;
              }
            }

            child.material.needsUpdate = true;
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
      if (child.isMesh && child.material._transmission > 0) {
        child.material.transmission = materialParams.transmission;
        child.material.ior = materialParams.ior;
        child.material.roughness = materialParams.roughness;
        child.material.thickness = materialParams.thickness;
        //child.material.attenuationDistance = materialParams.attenuationDistance;
        child.material.envMapIntensity = materialParams.envMapIntensity;
        child.material.opacity = materialParams.opacity;

        if (sceneParams.doubleSided) {
          child.material.side = THREE.DoubleSide;
        } else {
          child.material.side = THREE.FrontSide;
        }
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
runApp(app, scene, renderer, camera, true, undefined, composer);
