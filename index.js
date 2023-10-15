import { runApp } from './src/core-utils';
import { app, scene, renderer, camera, composer } from './src/setup-scene';

runApp(app, scene, renderer, camera, true, undefined, composer);
