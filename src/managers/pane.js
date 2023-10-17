import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { sceneParams } from '../params';

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

        this.sceneParamsFolder = this.pane.addFolder({
            title: 'Scene Params',
        });

        this.bloomParamsFolder = this.pane.addFolder({
            disabled: !sceneParams.bloom,
            title: 'Model Bloom Params',
        });

        this.toneMappingFolder = this.pane.addFolder({
            title: 'Tone Mapping Params',
        });
    }
}

export { PaneManager };
