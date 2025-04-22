import { MODEL } from "@/config/constants";
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { messages, tools, previousResponseId } = await request.json();
    console.log("1. Received messages:", messages);

    const openai = new OpenAI();
    console.log("2. Making request to OpenAI with model:", MODEL);

    const events = await openai.responses.create({
      model: MODEL,
      input: messages,
      tools,
      stream: true,
      parallel_tool_calls: false,
      previous_response_id: previousResponseId,
      store: true, // Enable response storage for threading
    });

    // Create a ReadableStream that emits SSE data
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of events) {
            // Format each event with type and data
            const data = JSON.stringify({
              event: event.type,
              data: event,
            });
            
            // Ensure each chunk is flushed immediately
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }
          // End of stream
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Error in streaming loop:", error);
          // Send error event to client
          const errorData = JSON.stringify({
            event: "error",
            data: { message: error instanceof Error ? error.message : "Stream error occurred" },
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
