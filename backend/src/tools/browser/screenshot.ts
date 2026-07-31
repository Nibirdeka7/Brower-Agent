import path from "path"
import fs from "fs"
import { tool } from "langchain"
import { z } from "zod"
import { browserManager } from "@/browser/BrowserManager"
import { CLIENT_RENEG_LIMIT } from "tls"

function getDir(): string {
    const dir = path.resolve(process.env.SCREENSHOTS_DIR ?? "./screenshots");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

export const takeScreenShotTool = tool(
    async ({fullPage, region, saveToFile, label}) => {
        try {
            const page = browserManager.getPage()
            const opts: Parameters<typeof page.screenshot>[0] = {type: "png", fullPage: fullPage ?? false};
            if(region) {opts.clip = region; opts.fullPage = false};
            const buffer = await page.screenshot(opts);
            const base64 = buffer.toString("base64")
            let filePath: string | undefined;
            if(saveToFile !== false){
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const name = label ? `${label}_${timestamp}.png` : `screenshot_${timestamp}.png`;
                filePath = path.join(getDir(), name);
                fs.writeFileSync(filePath, buffer);
                console.log(`[Screenshot] saved: ${filePath}`);
            }
          
            return JSON.stringify({
                success: true,
                base64,
                filePath,
                sizeKB: Math.round(buffer.length/1024),
                url: page.url(),
                message: `Screenshot capturede (${Math.round(buffer.length/1024)}KB). Pass base64 to analyze_screenshot for visual details`,
            });
        } catch (error) {
            return JSON.stringify({ success: false, error: String(error) });
        }
    },
    {
        name: "take_screenshot",
        description: "Capture a browser screenshot. Returns base64 PNG. Use when accessibility tree is insufficient (canvas, video, complex layouts)",
        schema: z.object({
            fullPage: z.boolean().optional().default(true).describe("Capture full scrollable page vs viewport"),
            region: z.object({
                x: z.number(),
                y: z.number(),
                width: z.number(),
                height: z.number()
            }).optional(),
            saveToFile: z.boolean().optional().default(false),
            label: z.string().optional().describe("Filename prefix for saved screenshot"),
        })
    }
)