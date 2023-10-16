import { SceneManager } from './src/managers/scene';

const container = document.querySelector('#container');
const sceneManager = new SceneManager(container);

sceneManager.setupScene();
