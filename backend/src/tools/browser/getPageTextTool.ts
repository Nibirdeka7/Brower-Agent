import { browserManager } from "@/browser/BrowserManager"
import { tool } from "langchain"
import {z} from "zod"

export const getPageTextTool = tool(
    async ({ selector, maxChars }) => {
        try {
            const page = browserManager.getPage();
            let text: string;
            if(selector){
                text = await page.locator(selector).first().innerText();
            } else {
                text = await page.evaluate(() => {
                    const c = document.body.cloneNode(true) as HTMLElement;
                    c.querySelectorAll("script,style,noscript").forEach(e => e.remove());
                    return c.innerText ?? c.textContent ?? "";
                });
            }
            text = text.replace(/\s+/g, " ").trim();
            const limit = maxChars ?? 4000;
            return text.length > limit ? `${text.slice(0, limit)}\n...[truncated ${text.length - limit} chars]` : text;
        } catch (error) {
            return JSON.stringify({error: String(error)});
        }
    },
    {
        name: "get_page_text",
        description: "Extract visible text from page or specific element. Use to read prices, confirmation messages or content.",
        schema: z.object({
            selector: z.string().optional().describe("CSS selector for specific element. If omitted, entire page text is extracted"),
            maxChars: z.number().optional().default(4000).describe("Maximum number of characters to extract (default: 1000)"),
        })
    }
)