const handleFileDrop = e => {
    const files = e.dataTransfer.files;

    if (!files) return;

    const file = files[0];

    if (!file) return;

    return file;
};

const blobFileTransformer = file => {
    const { name } = file;
    const fileExtension = name.split('.').pop().toLowerCase();
    return { name, blob: URL.createObjectURL(file), extension: fileExtension };
};

export { handleFileDrop, blobFileTransformer };
