import { browserManager } from "@/browser/BrowserManager";
import { shortPause } from "@/utils/mediumPause";
import { withRetry } from "@/utils/withRetry";
import { tool } from "langchain";
import { Strategy } from "passport-google-oauth20";
import {z} from "zod";


async function scrollIntoView(page: import("playwright").Page, locator: import('playwright').Locator){
    try { await locator.scrollIntoViewIfNeeded({ timeout: 3000 }) } catch {  }
}

async function resolveAndClick(
    page: import("playwright").Page,
    params: {
        selector?: string;
        text?: string;
        ariaLabel?: string;
        role?: string;
        x?: number;
        y?: number;
        button?: "left" | "right" | "middle";
        doubleClick?: boolean;
    }
): Promise<{success: boolean; strategy: string; error?: string}>{
    const { selector, text, ariaLabel, role, x, y, button = "left", doubleClick = false } = params;
    const clickOpts = { button, clickCount: doubleClick ? 2 : 1 };

    if(ariaLabel){
        try {
            const loc  = page.getByLabel(ariaLabel).first();
            await scrollIntoView(page, loc);
            await loc.click(clickOpts);
            return { success: true, strategy: `aria-label="${ariaLabel}"` };
        } catch {

        }
    }
    if(role){
        try {
            const nameOpt = ariaLabel ?? text;
            const loc = nameOpt ? page.getByRole(role as Parameters<typeof page.getByRole>[0], {name: nameOpt, exact: false}).first(): page.getByRole(role as Parameters<typeof page.getByRole>[0]).first();
            await scrollIntoView(page, loc);
            await loc.click(clickOpts);
            return { success: true, strategy:  `role=${role}${nameOpt ? `[name="${nameOpt}"]` : ""}` };
        } catch (error) {
             
        }
    }
    if(text){
        try {
            const loc = page.getByText(text, {exact: false}).first();
            await scrollIntoView(page, loc);
            await loc.click(clickOpts);
            return {success: true, strategy: `text="${text}"`}
        } catch (error) {
            
        }
    }


    return {success: false, strategy: "all", error: "No matching element. Try get_accessibility_tree or find_element"}
}

export const clickTool = tool(
    async ({ selector, text, ariaLabel, role, x, y, button, doubleClick }) => {
        return withRetry(async () => {
            const page = browserManager.getPage();
            await shortPause();
            const result = await resolveAndClick(page, {
                selector, text, ariaLabel, role, x, y,
                button: button as "left" | "right" | "middle",
                doubleClick
            })
            await shortPause();
            if(result.success){
                return JSON.stringify({ success: true, strategy: result.strategy, currentUrl: page.url()});
            }
            return JSON.stringify({ success: false, error: result.error })
        }, { attempts: 3, baseDelayMs: 600 }).catch(e => JSON.stringify({ success: false, error: String(e) }))
    },
    {
        name: "click",
        description: "Click a page element. Automatically scrolls element into view first. Strategy priority: ariaLabel -> role -> text -> selector.",
        schema: z.object({
            selector: z.string().optional().describe("CSS Selector for the element to click"),
            text: z.string().optional().describe("Visible text on element to click"),
            ariaLabel: z.string().optional().describe("aria-label of element to click"),
            role: z.string().optional().describe("ARIA role of element to click"),
            x: z.number().optional().describe("X coordinate to click"),
            y: z.number().optional().describe("Y coordinate to click"),
            button: z.enum(["left", "right", "middle"]).optional().default("left"),
            doubleClick: z.boolean().optional().default(false),
        })
    }
)