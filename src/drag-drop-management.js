import { updateHDR, updateHDRList, updateModel } from './setup-scene';
import { to } from 'await-to-js';

export const loadFile = file => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('File not found'));
        }

        reader.onerror = () =>
            reject(new Error('An error occurred while loading the file'));

        reader.onload = () => resolve(reader.result);

        reader.readAsDataURL(file);
    });
};

const container = document.querySelector('#container');

container.addEventListener('drop', e => {
    e.preventDefault();

    handleFileDrop(e);
});

container.addEventListener('dragover', e => {
    e.preventDefault();
});

const handleFileDrop = e => {
    const files = e.dataTransfer.files;

    if (!files) return;

    const file = files[0];

    if (!file) return;

    updateFileManager(file);
};

const updateFileManager = async file => {
    const [err, response] = await to(loadFile(file));

    const { name } = file;
    const fileExtension = name.split('.').pop().toLowerCase();

    console.log({ response, fileExtension });

    if (fileExtension === 'hdr') {
        const hdrUrl = URL.createObjectURL(file);
        updateHDR(hdrUrl);
        updateHDRList(name.split('.')[0], hdrUrl);
        return;
    }

    if (fileExtension === 'glb') {
        const hdrUrl = URL.createObjectURL(file);
        updateModel(hdrUrl);
        return;
    }

    return;
};
