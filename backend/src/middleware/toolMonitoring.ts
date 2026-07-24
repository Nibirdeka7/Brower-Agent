import {tool, createAgent, createMiddleware} from "langchain"

export const toolMonitoringMiddleware = createMiddleware({
    name: "ToolMonitoringMiddleware",
    wrapToolCall: async (request, handler) => {
        console.log(`Executing tool-------: ${request.toolCall.name}`);
        console.log(`Arguments -----------: ${JSON.stringify(request.toolCall.args)}`);
        try {
            const result = await handler(request);
            console.log("Tool completed successfully");
            return result;
            
        } catch (error) {
            console.log(`Tool failed: ${error}`);
            throw error;
        }
    },
    
})