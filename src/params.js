export const bloomParams = {
    threshold: 1.0,
    strength: 0.15,
    radius: 0,
};

export const toneMappingParams = {
    exposure: 1,
};

export const hdrList = {
    hdri_lampadario_13: 'hdri_lampadario_13.hdr',
    hdri_lampadario_05: 'hdri_lampadario_05.hdr',
};

export const sceneParams = {
    backgroundBlur: 0.5,
    backgroundIntensity: 1,
    envMapIntensity: 1,
    bloom: true,
    hdr: Object.values(hdrList)[0],
};
