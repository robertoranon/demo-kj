// This core-utils contains the most important/top-level functions needed in creating a threejs application
import {
    WebGLRenderer,
    PCFSoftShadowMap,
    PerspectiveCamera,
    Box3,
    Sphere,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Initializes a reasonable uniforms object ready to be used in fragments
 * @returns a uniforms object with u_time, u_mouse and u_resolution
 */
const getDefaultUniforms = () => {
    return {
        u_time: { value: 0.0 },
        u_mouse: {
            value: {
                x: 0.0,
                y: 0.0,
            },
        },
        u_resolution: {
            value: {
                x: window.innerWidth * window.devicePixelRatio,
                y: window.innerHeight * window.devicePixelRatio,
            },
        },
    };
};

/**
 * This creates the renderer, by default calls renderer's setPixelRatio and setSize methods
 * further reading on color management: See https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
 * @param {object} rendererProps props fed to WebGlRenderer constructor
 * @param {function} configureRenderer custom function for consumer to tune the renderer, takes renderer as the only parameter
 * @returns created renderer
 */
const createRenderer = (
    rendererProps = {},
    configureRenderer = renderer => {}
) => {
    const renderer = new WebGLRenderer(rendererProps);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;

    // more configurations to the renderer from the consumer
    configureRenderer(renderer);
    return renderer;
};

/**
 * This function creates the EffectComposer object for post processing
 * @param {object} renderer The threejs renderer
 * @param {object} scene The threejs scene
 * @param {object} camera The threejs camera
 * @param {function} extraPasses custom function that takes takes composer as the only parameter, for the consumer to add custom passes
 * @returns The created composer object used for post processing
 */
const createComposer = (renderer, scene, camera, extraPasses) => {
    const composer = new EffectComposer(renderer);
    const renderScene = new RenderPass(scene, camera);
    const outputPass = new OutputPass();

    composer.addPass(renderScene);

    // custom passes that the consumer wants to add
    extraPasses(composer);

    composer.addPass(outputPass);
    return composer;
};

/**
 * This function creates the three.js camera
 * @param {number} fov Field of view, def = 45
 * @param {number} near nearest distance of camera render range
 * @param {number} far furthest distance of camera render range
 * @param {object} camPos {x,y,z} of camera position
 * @param {object} camLookAt {x,y,z} where camera's looking at
 * @param {number} aspect Aspect ratio of camera, def = screen aspect
 * @returns the created camera object
 */
const createCamera = (
    fov = 45,
    near = 0.1,
    far = 100,
    camPos = { x: 0, y: 0, z: 5 },
    camLookAt = { x: 0, y: 0, z: 0 },
    aspect = window.innerWidth / window.innerHeight
) => {
    const camera = new PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(camPos.x, camPos.y, camPos.z);
    camera.lookAt(camLookAt.x, camLookAt.y, camLookAt.z); // this only works when there's no OrbitControls
    camera.updateProjectionMatrix();
    return camera;
};

const computeWorldBounds = (
    sceneObject,
    recomputeMeshes = true,
    considerNonVisible = true
) => {
    const bb = new Box3();

    sceneObject.updateMatrixWorld(false);

    if (sceneObject.visible || considerNonVisible) {
        if (sceneObject.isMesh) {
            if (sceneObject.geometry.boundingBox === null || recomputeMeshes) {
                sceneObject.geometry.computeBoundingBox();
            }

            bb.copy(sceneObject.geometry.boundingBox);
            bb.applyMatrix4(sceneObject.matrixWorld);
        }

        const children = sceneObject.children;

        for (const c of children) {
            computeWorldBounds(c, recomputeMeshes, considerNonVisible);
            bb.union(c.boundingBox);
        }
    }

    sceneObject.boundingBox = bb;
    sceneObject.boundingSphere = new Sphere();
    sceneObject.boundingBox.getBoundingSphere(sceneObject.boundingSphere);
};

export {
    getDefaultUniforms,
    createRenderer,
    createComposer,
    createCamera,
    computeWorldBounds,
};
