import { browserManager } from "@/browser/BrowserManager"
import { mediumPause } from "@/utils/mediumPause"
import { withRetry } from "@/utils/withRetry"
import {tool} from "@langchain/core/tools"
import {z} from "zod"

export const navigateTool = tool(
    async({url, waitUntil}) => {
        return withRetry(async() => {
            const page = browserManager.getPage();
            const response = await page.goto(url, {
                waitUntil: (waitUntil ?? "domcontentloaded") as "load"|"domcontentloaded"|"networkidle",
                timeout: 30_000,
            });

            await mediumPause();

            let finalUrl = page.url();
            for(let i = 0; i < 5; i++){
                await new Promise(r => setTimeout(r, 300));
                const current = page.url();
                if(current === finalUrl) break;
                finalUrl = current;
            }
            return JSON.stringify({
                success: true,
                url: finalUrl,
                title: await page.title(),
                status: response?.status() ?? 0,
                hint: "Call dismiss_overlays next if cookie banners may be present.",
            })
        }, {attempts: 2}).catch((e:any) => JSON.stringify({ success: false, error: String(e) }))
    }, 
    {
        name: "navigate",
        description: "Navigate to a URL. Waits for URL to stabilize (handles redirects). After navigating call dismiss_overlays then get_accessibility_tree",
        schema: z.object({
            url: z.string().describe("Full URL including https://"),
            waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional().default("domcontentloaded"),
        })
    }
)