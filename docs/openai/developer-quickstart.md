# Developer Quickstart - OpenAI Responses API

## Overview
The OpenAI API provides a simple interface to state-of-the-art AI models for text generation, natural language processing, computer vision, and more.

## Basic Text Generation

### JavaScript
```javascript
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "gpt-4o",
    input: "Write a one-sentence bedtime story about a unicorn."
});

console.log(response.output_text);
```

### Python
```python
from openai import OpenAI
client = OpenAI()

response = client.responses.create(
    model="gpt-4o",
    input="Write a one-sentence bedtime story about a unicorn."
)

print(response.output_text)
```

### cURL
```bash
curl "https://api.openai.com/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-4o",
        "input": "Write a one-sentence bedtime story about a unicorn."
    }'
```

## Data Retention
- Response objects saved for 30 days by default
- Can be disabled with `store: false`
- Viewable in dashboard logs or via API
- Data not used for training without explicit consent

## Image Analysis

### JavaScript
```javascript
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "gpt-4o",
    input: [
        { role: "user", content: "What two teams are playing in this photo?" },
        {
            role: "user",
            content: [
                {
                    type: "input_image", 
                    image_url: "https://upload.wikimedia.org/wikipedia/commons/3/3b/LeBron_James_Layup_%28Cleveland_vs_Brooklyn_2018%29.jpg",
                }
            ],
        },
    ],
});
```

## Tools Integration

### JavaScript
```javascript
import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
    model: "gpt-4o",
    tools: [ { type: "web_search_preview" } ],
    input: "What was a positive news story from today?",
});
```

## Streaming Responses

### JavaScript
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

### Python
```python
from openai import OpenAI
client = OpenAI()

stream = client.responses.create(
    model="gpt-4o",
    input=[
        {
            "role": "user",
            "content": "Say 'double bubble bath' ten times fast.",
        },
    ],
    stream=True,
)

for event in stream:
    print(event)
```

## Agents

### Python Example
```python
from agents import Agent, Runner
import asyncio

spanish_agent = Agent(
    name="Spanish agent",
    instructions="You only speak Spanish.",
)

english_agent = Agent(
    name="English agent",
    instructions="You only speak English",
)

triage_agent = Agent(
    name="Triage agent",
    instructions="Handoff to the appropriate agent based on the language of the request.",
    handoffs=[spanish_agent, english_agent],
)

async def main():
    result = await Runner.run(triage_agent, input="Hola, ¿cómo estás?")
    print(result.final_output)

if __name__ == "__main__":
    asyncio.run(main())
```

## Key Features
1. Text Generation
2. Image Analysis
3. Tool Integration
4. Streaming Responses
5. Agent Building
6. Custom Function Calling
7. Web Search Integration 