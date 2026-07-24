import { createAgent } from "langchain";
import { BASE_SYSTEM_PROMPT } from "./prompt/prompt"
import { LLM } from "../llm/llm";
import { HumanMessage } from "@langchain/core/messages";
import { serachTools } from "../tools/webTools";
import { toolMonitoringMiddleware } from "../middleware/toolMonitoring";

export async function BrowserAgent(){
    const llm = LLM.getInstance("gemini")
    const agent = createAgent({
        model: llm, 
        tools: [...serachTools],
        systemPrompt: BASE_SYSTEM_PROMPT,
        middleware: [toolMonitoringMiddleware]
    })

    async function invokeBrowserAgent(userInput: string){
        const agentOutput = await agent.invoke(
            {
                messages: [
                    new HumanMessage(userInput),
                ]
            }
        );
        const aiResponse = agentOutput.messages[agentOutput.messages.length - 1].content as string;
        return aiResponse; 
    }

    async function streamBrowserAgent(userInput: string, config: any){
        let fullContent = "";

        for await (const chunk of await agent.stream(
            {messages: [{role: "user", content: userInput }]},
            { streamMode: "updates",
                configurable: {}
            }
        )){
            const updates = chunk?.tools?.messages
            const req = chunk?.model_request?.messages

            if(updates && updates.length > 0){
                
            }
            if(req && req.length > 0){
                const aiMsg = req[0];
                const content = aiMsg?.content ?? "";
                const hasToolCalls = (aiMsg as any)?.tool_calls && (aiMsg as any).tool_calls.length > 0;

                if (hasToolCalls){
                    // ai thinking
                    config.writer({
                        manager_name: "BrowserAgent",
                        content: '<think>' +content + '</think>'
                    })
                } else {
                    // ai response
                    fullContent += content;
                    config.writer({
                        manager_name: "BrowserAgent",
                        content: content
                    })
                }
            }
        }
        return {
            fullContent
        }
    }

    return {
        invokeBrowserAgent, 
        streamBrowserAgent
    }
}