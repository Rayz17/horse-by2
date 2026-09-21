export const SCREEN_WIDTH = 720;
export const SCREEN_HEIGHT = 1280;
export const GRID_SIZE = 6;
export const GRID_PADDING = 28;
export const GRID_CENTER_X = SCREEN_WIDTH / 2;

export function computeGameLayout() {
    const sidePad = 28;
    const gridWidth = SCREEN_WIDTH - sidePad * 2;
    const headerH = 80;
    const progressH = 40;
    const topGap = 10;
    const midGap = 8;
    const bottomSafe = 36;

    let inventoryH = 78;
    let infoH = 124;
    let shopH = 136;

    const gridTop = headerH + progressH + topGap;
    const growBottom = (extra: number) => {
        const toShop = Math.min(32, extra);
        shopH += toShop;
        extra -= toShop;
        const toInfo = Math.min(20, extra);
        infoH += toInfo;
        extra -= toInfo;
        const toInv = Math.min(10, extra);
        inventoryH += toInv;
        extra -= toInv;
        return extra;
    };

    let usedBelow = inventoryH + midGap + infoH + midGap + shopH + bottomSafe;
    let slack = SCREEN_HEIGHT - usedBelow - gridTop - gridWidth;
    if (slack > 0) slack = growBottom(slack);

    usedBelow = inventoryH + midGap + infoH + midGap + shopH + bottomSafe;
    const extraGap = Math.max(0, Math.min(12, SCREEN_HEIGHT - usedBelow - gridTop - gridWidth));
    const gridCenterY = gridTop + gridWidth / 2;
    const inventoryCenterY = gridTop + gridWidth + extraGap + midGap + inventoryH / 2;
    const infoPanelCenterY = inventoryCenterY + inventoryH / 2 + midGap + infoH / 2;
    const shopCenterY = SCREEN_HEIGHT - bottomSafe - shopH / 2;
    const headerCenterY = headerH / 2;
    const progressCenterY = headerH + progressH / 2;
    const nextPreviewX = sidePad + 36;
    const nextPreviewY = headerCenterY + 8;

    return {
        gridWidth,
        gridCenterX: GRID_CENTER_X,
        gridCenterY,
        gridTop,
        inventoryCenterY,
        infoPanelCenterY,
        shopCenterY,
        progressCenterY,
        headerCenterY,
        headerH,
        progressH,
        inventoryH,
        infoH,
        shopH,
        sidePad,
        nextPreviewX,
        nextPreviewY,
        contentWidth: gridWidth,
        routeBarY: shopCenterY - shopH / 2 - 18
    };
}

export const TOAST_Y = 118;
export const TOP_BAR_Y = 40;
export const SCORE_X = 220;
export const NEXT_PREVIEW_X = 64;
export const NEXT_PREVIEW_Y = 48;
