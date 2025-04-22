# Streaming API Responses

## Overview
Learn how to stream model responses from the OpenAI API using server-sent events.

## Basic Streaming Setup

### JavaScript Example
```javascript
import { OpenAI } from "openai";
const client = new OpenAI();

const stream = await client.responses.create({
    model: "gpt-4o",
    input: [
        {
            role: "user",
            content: "Say 'double bubble bath' ten times fast.",
        },
    ],
    stream: true,
});

for await (const event of stream) {
    console.log(event);
}
```

## Event Types
```typescript
type StreamingEvent = 
    | ResponseCreatedEvent
    | ResponseInProgressEvent
    | ResponseFailedEvent
    | ResponseCompletedEvent
    | ResponseOutputItemAdded
    | ResponseOutputItemDone
    | ResponseContentPartAdded
    | ResponseContentPartDone
    | ResponseOutputTextDelta
    | ResponseOutputTextAnnotationAdded
    | ResponseTextDone
    | ResponseRefusalDelta
    | ResponseRefusalDone
    | ResponseFunctionCallArgumentsDelta
    | ResponseFunctionCallArgumentsDone
    | ResponseFileSearchCallInProgress
    | ResponseFileSearchCallSearching
    | ResponseFileSearchCallCompleted
    | ResponseCodeInterpreterInProgress
    | ResponseCodeInterpreterCallCodeDelta
    | ResponseCodeInterpreterCallCodeDone
    | ResponseCodeInterpreterCallIntepreting
    | ResponseCodeInterpreterCallCompleted
    | Error
```

## Key Events to Listen For
- `response.created`
- `response.output_text.delta`
- `response.completed`
- `error`

## Response Output Text Delta Event
```typescript
interface ResponseOutputTextDelta {
  type: "response.output_text.delta";
  item_id: string;        // The ID of the output item
  output_index: number;   // The index of the output item
  content_index: number;  // The index of the content part
  delta: string;         // The text delta that was added
}
```

Example:
```json
{
  "type": "response.output_text.delta",
  "item_id": "msg_123",
  "output_index": 0,
  "content_index": 0,
  "delta": "In"
}
```

## Important Notes
1. Events are typed with predefined schemas
2. SDK provides typed instances for each event
3. Events can be identified using the `type` property
4. Some events occur once, others multiple times
5. Moderation is more challenging with streaming
6. Consider implications for production usage

## Advanced Use Cases
- Streaming function calls
- Streaming structured output

## Security Considerations
- Streaming makes content moderation more difficult
- Partial completions may be harder to evaluate
- Consider implications for production usage 