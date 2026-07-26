import { browserManager } from "@/browser/BrowserManager"
import { humanDelay } from "@/utils/mediumPause"
import { tool } from "langchain"
import {z} from "zod"


const DISMISS_SELECTORS = [
    "button[id*='accept']", "button[class*='accept']",
    "button[data-testid*='accept']", "#onetrust-accept-btn-handler",
    "#accept-recommended-btn-handler", ".css-dismiss", "[aria-label*='Accept cokkies']",
    "[aria-label*='accept cookies']", "button[id*='cookie']",

    "button[aria-label='Close']", "button[aria-label='close']",
    "button[aria-label='Dismiss']", "button[data-dismiss]",
    "[class*='modal-close']", "[class*='close-button']",
    "[class*='dismiss']", "[class*='popup-close']",

    "[class*='newsletter'] button[class*='close']",
    "[id*='newsletter'] button[class*='close']",
]    

export const dismissOverlaysTool = tool(
    async ({force}) => {
        try {
            const page = browserManager.getPage();
            const dismissed: string[] = [];
            for(const sel of DISMISS_SELECTORS){
                try {
                    const el = page.locator(sel).first();
                    const visible = await el.isVisible({timeout: 500});
                    if (visible){
                        await el.click({timeout: 1000});
                        await humanDelay(300, 600);
                        dismissed.push(sel);
                        if(!force) break;
                    }
                } catch (error) {
                    
                }
                if(dismissed.length === 0){
                    return JSON.stringify({ success: true, dismissed: [], message: "No overlays found." });

                }
                return JSON.stringify({
                    success: true,
                    dismissed,
                    message: `Dismissed ${dismissed.length} overlay(s): ${dismissed.join(", ")}`,
                });
            }
        } catch (error) {
            return JSON.stringify({ success: false, error: String(error) });
        }
    },
    {
        name: "dismiss_overlays",
        description: "Dismiss cookie consent banners, newsletter popups, modals and other overlays blocking the page. Call this tool after navigate.",
        schema: z.object({
            force: z.boolean().optional().default(false).describe("If true, dismiss all overlays regardless of page load status"),
        })
    }
)