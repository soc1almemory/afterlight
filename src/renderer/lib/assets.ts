export const assetUrl = (name: string) => new URL(`../../../assets/${name}`, import.meta.url).href;
