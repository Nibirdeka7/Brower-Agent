import {z} from "zod"
import {tool} from "@langchain/core/tools"
import {ExaSearchResults} from "@langchain/exa"
import Exa from "exa-js";
import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio"
const client = new Exa(process.env.EXA_API_KEY);

export const searchTool = tool(
    async ({query}: {query: string}) => {
        try {
            console.log("Web search query: ", query);
            const exaTool = new ExaSearchResults({
                client: client as any,
                searchArgs: {
                    numResults: 2,
                    type: "auto",
                },
            })
            const result = await exaTool.invoke(query);
            return result;
        } catch (error) {
            return JSON.stringify({
                error: `Failed to make web research, ${error}`
            })
        }
    },
    {
        name: "web_search",
        description: "Search the web to find real-time information",
        schema: z.object({
            query: z.string()
        })
    }
)

export const webScrapperTool = tool(
    async ({ weblink }) => {
        try {
            console.log("Web scrapper url: ", weblink);
            const loader = new CheerioWebBaseLoader(weblink);
            const docs = await loader.load();
            const serializeData = JSON.stringify(docs);
            return serializeData;

        } catch (error) {
            return JSON.stringify({
                error: `Failed to make web scrape, ${error}`
            })
        }
    },
    {
        name: "scrape_url",
        description: "Scrape the page to retrieve data",
        schema: z.object({ weblink: z.string() }),
    }
)

export const serachTools = [
    searchTool,
    webScrapperTool
]