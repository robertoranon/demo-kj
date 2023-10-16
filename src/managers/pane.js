import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

class PaneManager {
    constructor(containerElement, title = 'Generic Pane') {
        this.pane = new Pane({
            container: document.querySelector(containerElement),
            title,
        });

        this.pane.registerPlugin(EssentialsPlugin);

        this.fpsGraph = this.pane.addBlade({
            view: 'fpsgraph',
            label: 'fpsgraph',
            rows: 2,
        });

        this.hdrList = {
            hdri_lampadario_13: 'hdri_lampadario_13.hdr',
            hdri_lampadario_05: 'hdri_lampadario_05.hdr',
            royal_esplanade_1k: 'royal_esplanade_1k.hdr',
        };

        this.sceneParams = {
            backgroundBlur: 0.5,
            backgroundIntensity: 1,
            envMapIntensity: 1,
            bloom: false,
            light_bloom: false,
            hdr: Object.values(this.hdrList)[0],
        };

        this.bloomParams = {
            threshold: 0.5,
            strength: 0.5,
            radius: 0,
            exposure: 1,
        };

        this.sceneParamsFolder = this.pane.addFolder({
            title: 'Scene Params',
        });

        this.bloomParamsFolder = this.pane.addFolder({
            disabled: !this.sceneParams.bloom,
            title: 'Model Bloom Params',
        });
    }
}

export { PaneManager };
