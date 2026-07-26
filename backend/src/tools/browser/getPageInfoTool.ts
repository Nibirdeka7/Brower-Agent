import { browserManager } from "@/browser/BrowserManager";
import { tool } from "langchain"
import {z} from "zod"

export const getPageInfoTool = tool(
    async () => {
        try {
            const page = browserManager.getPage();
            const metaDesc = await page.$eval('meta[name="description"]', e => e.getAttribute("content")).catch(() => null);
            return JSON.stringify({ url: page.url(), title: await page.title(), metaDescription: metaDesc ?? "" });
        } catch (error) {
            return JSON.stringify({ error: String(error) });
        }
    },
    { 
        name: "get_page_info",
        description: "Get current page URL, tittle, and meta description. Use to confirm navigation completion.",
        schema: z.object({}),
    }
)