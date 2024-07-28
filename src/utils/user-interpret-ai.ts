import { OpenAI } from "openai";
import { SlackMessageRetriever } from './slack-message-retriever';
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const slackBot = new SlackMessageRetriever(process.env.SLACK_BOT_TOKEN ?? '');

const UserInputSchema = z.object({
  channelName: z.string(),
  daysAgo: z.number().default(3),
});

type UserInput = z.infer<typeof UserInputSchema>;

async function processUserQuery(userInput: string): Promise<string> {
  const parsedInput = await parseUserInput(userInput);
  
  if (!parsedInput.channelName) {
    return "I couldn't determine which Slack channel to search in. Please specify a channel name in your query.";
  }

  await slackBot.retrieveAndExportMessages(parsedInput.channelName, parsedInput.daysAgo);

  const outputDir = path.join(process.cwd(), "data", "slack-output");
  const jsonFilepath = path.join(outputDir, `${parsedInput.channelName}_messages.json`);
  
  if (!fs.existsSync(jsonFilepath)) {
    return `No messages found for channel '${parsedInput.channelName}' in the last ${parsedInput.daysAgo} days.`;
  }

  const messages = JSON.parse(fs.readFileSync(jsonFilepath, 'utf-8'));

  const response = await analyzeMessagesWithAI(userInput, messages, parsedInput.channelName);

  return response;
}

async function parseUserInput(input: string): Promise<UserInput> {
  const prompt = `
    Given the following user query, fill out this object with the information you can extract:
    {
      "channelName": "",
      "daysAgo": 3
    }

    If the channel name is not specified, leave the field empty.
    If the number of days is not specified, use the default value of 3.
    Only include the JSON object in your response, nothing else.

    User Query: "${input}"
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that extracts information from user queries." },
        { role: "user", content: prompt }
      ],
    });

    const content = completion.choices[0]?.message.content;
    if (!content) {
      throw new Error("No content in GPT response");
    }

    const parsedContent = JSON.parse(content);
    return UserInputSchema.parse(parsedContent);
  } catch (error) {
    console.error("Error parsing user input:", error);
    throw new Error("Failed to parse user input");
  }
}

function convertTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
}

async function analyzeMessagesWithAI(userQuery: string, messages: any[], channelName: string): Promise<string> {
  const formattedMessages = messages.map(msg => ({
    ...msg,
    ts: convertTimestamp(parseFloat(msg.ts))
  }));

  const prompt = `
    User Query: "${userQuery}"
    
    Analyze the following Slack messages from the channel "${channelName}" and provide a concise answer to the user's query:
    ${JSON.stringify(formattedMessages, null, 2)}

    The timestamps in the messages are already in a human-readable format. Please include them in your response as part of your sentence when referencing specific messages.

    Make sure to include the name of the user who sent the message when relevant.
    
    Concise Answer:
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant analyzing Slack messages." },
        { role: "user", content: prompt }
      ],
    });

    return completion.choices[0]?.message.content ?? "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error in OpenAI API call:", error);
    return "I encountered an error while processing your request. Please try again later.";
  }
}

export { processUserQuery };