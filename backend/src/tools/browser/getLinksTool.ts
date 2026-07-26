import { browserManager } from "@/browser/BrowserManager";
import { tool } from "langchain";
import {z} from "zod"
export const getLinksTool = tool(
    async ({ filter }) => {
        try {
            const page = browserManager.getPage();
            const links = await page.evaluate(() => 
                Array.from(document.querySelectorAll("a[href]"))
                  .map(a => ({text: (a as HTMLAnchorElement).textContent?.trim() ?? "", href: (a as HTMLAnchorElement).href}))
                  .filter(l => l.href.startsWith("http") && l.text)
                  .slice(0, 50)
            )
            const filtered = filter ? links.filter(l => l.text.toLowerCase().includes(filter.toLowerCase()) || l.href.toLowerCase().includes(filter.toLowerCase())) : links;
            
            return JSON.stringify({links: filtered});

        } catch (error) {
            return JSON.stringify({error: String(error)});
        }
    },
    {
        name: "get_links",
        description: "Get clickable links from the page, optionally filtered by text or URL substring.",
        schema: z.object({
            filter: z.string().optional().describe("Filter links by text or URL containing this string"),
        })
    }
)