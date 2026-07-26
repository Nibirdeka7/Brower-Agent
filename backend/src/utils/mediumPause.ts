import {randInt} from "@/browser/BrowserManager"

export function humanDelay(minMs = 800, maxMs = 250): Promise<void>{
    return new Promise(r => setTimeout(r, randInt(minMs, maxMs)));
}

export const shortPause = () => humanDelay(100, 400);

export const mediumPause = () => humanDelay(500, 1200);

export const longPause = () => humanDelay(1500, 3500);