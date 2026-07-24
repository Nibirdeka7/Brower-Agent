import { graph } from "@/graph/agent-collaboration";
import { LLM } from "@/llm/llm";
import { Request, Response } from "express";

export const postChatStream = async (req: Request, res: Response) => {
    try {
        const { message, userId } = req.body;
        if(!userId) return res.status(400).json({ error: "Provide userId and threadId" });
        // const llm = LLM.getInstance('fireworks_minimax')

        res.setHeader('Content=Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const sendSSE = (event: string, data: any) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            (res as any).flush?.();
        };
        // if existingThreadId exist resume the graph, means the user send it
        const input: any = {messages: [{ role: "user", content: message }], userId}

        const config = {
            streamMode: "custom" as const,
            subgraphs: true,
            recursionLimit: 400,
            configurable: {}
        }

        const graphStream = await graph.stream(input, config);
        
        let streamingText = '';
        let thinkingBuffer = '';
        let inThinking = false;
        try {
            for await (const [namespace, chunk] of graphStream){
                if((chunk as any).manager_name || (chunk as any).content){
                    const content = (chunk as any)?.content;
                    const parts = content.split(/(<think>|<\/think>)/);
                    parts.forEach((part: string) => {
                        if(part === "<think>"){
                            inThinking = true;
                        } else if(part === "<\/think>"){
                            inThinking = false;
                        } else if(part.length > 0){
                            if(inThinking){
                                thinkingBuffer += part;
                                sendSSE("thinking", {thinking: part});
                            } else {
                                streamingText += part;
                                sendSSE("message", { message: part });
                            }
                        }
                    });
                }
            }
            sendSSE("end", { ok: true });
            res.end();
        } catch (error) {
            console.error('Streaming Error:', (error as Error));
            sendSSE("error", { error: (error as Error).message });
            res.end();
        }

    } catch (error: any) {
        console.error("Route error:", error)
        if(!res.headersSent){
            res.status(500).json({ok: false, error: error.message});
        } else {
            res.end();
        }
        
    }
}