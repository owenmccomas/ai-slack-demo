import { WebClient, ConversationsHistoryResponse } from "@slack/web-api";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { createObjectCsvWriter } from "csv-writer";

dotenv.config();

interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  user_name?: string;
  [key: string]: any;
}

export class SlackMessageRetriever {
  private client: WebClient;
  private userCache: Map<string, string>;

  constructor(token: string) {
    this.client = new WebClient(token);
    this.userCache = new Map();
  }

  async getChannelId(channelName: string): Promise<string | null> {
    try {
      const response = await this.client.conversations.list();
      const channel = response.channels?.find((c) => c.name === channelName);
      return channel?.id || null;
    } catch (error) {
      console.error("Error getting channel ID:", error);
      return null;
    }
  }

  async getUserName(userId: string): Promise<string> {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!;
    }

    try {
      const response = await this.client.users.profile.get({ user: userId });
      if (response.ok && response.profile) {
        const userName =
          response.profile.real_name || response.profile.display_name || userId;
        this.userCache.set(userId, userName);
        return userName;
      }
      throw new Error("Failed to retrieve user profile");
    } catch (error) {
      console.error(`Error fetching user info for ${userId}:`, error);
      return userId;
    }
  }

  async retrieveMessages(
    channelId: string,
    startTime?: number,
    endTime?: number,
  ): Promise<SlackMessage[]> {
    let messages: SlackMessage[] = [];
    let cursor: string | undefined;

    try {
      do {
        const response: ConversationsHistoryResponse =
          await this.client.conversations.history({
            channel: channelId,
            oldest: startTime?.toString(),
            latest: endTime?.toString(),
            cursor: cursor,
          });

        if (response.messages) {
          for (const msg of response.messages as SlackMessage[]) {
            if (msg.user) {
              msg.user_name = await this.getUserName(msg.user);
            }
            messages.push(msg);
          }
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);
    } catch (error) {
      console.error("Error retrieving messages:", error);
    }

    return messages;
  }

  messagesToJson(messages: SlackMessage[]): string {
    return JSON.stringify(messages, null, 2);
  }

  async exportMessagesToCSV(
    messages: SlackMessage[],
    filepath: string,
  ): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: "ts", title: "Timestamp" },
        { id: "user_name", title: "User" },
        { id: "text", title: "Message" },
      ],
    });

    const records = messages.map((msg) => ({
      ts: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      user_name: msg.user_name || msg.user,
      text: msg.text,
    }));

    await csvWriter.writeRecords(records);
    console.log(`CSV file created at ${filepath}`);
  }

    async retrieveAndExportMessages(channelName: string, daysAgo: number): Promise<void> {
    const channelId = await this.getChannelId(channelName);

    if (!channelId) {
      console.error(`Channel '${channelName}' not found.`);
      return;
    }

    const startTime = Math.floor(Date.now() / 1000) - daysAgo * 86400;

    const outputDir = path.join(process.cwd(), "data", "slack-output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const messages = await this.retrieveMessages(channelId, startTime);
    
    const jsonOutput = this.messagesToJson(messages);
    const jsonFilepath = path.join(outputDir, `${channelName}_messages.json`);
    fs.writeFileSync(jsonFilepath, jsonOutput);

    const csvFilepath = path.join(outputDir, `${channelName}_messages.csv`);
    await this.exportMessagesToCSV(messages, csvFilepath);

    console.log(`Retrieved ${messages.length} messages. Saved to JSON: ${jsonFilepath} and CSV: ${csvFilepath}`);
  }
}



async function main() {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    console.error("Please set the SLACK_BOT_TOKEN environment variable.");
    return;
  }

  const retriever = new SlackMessageRetriever(slackToken);

  const channelName = "message-retriever";
  const channelId = await retriever.getChannelId(channelName);

  if (!channelId) {
    console.error(`Channel '${channelName}' not found.`);
    return;
  }

  const daysAgo = 7;
  const startTime =
    daysAgo > 0 ? Math.floor(Date.now() / 1000) - daysAgo * 86400 : undefined;

  const outputDir = path.join(process.cwd(), "data", "slack-output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const messages = await retriever.retrieveMessages(channelId, startTime);
  
  const jsonOutput = retriever.messagesToJson(messages);
  const jsonFilepath = path.join(outputDir, `${channelName}_messages.json`);
  fs.writeFileSync(jsonFilepath, jsonOutput);

  const csvFilepath = path.join(outputDir, `${channelName}_messages.csv`);
  await retriever.exportMessagesToCSV(messages, csvFilepath);

  console.log(`Retrieved ${messages.length} messages. Saved to JSON: ${jsonFilepath} and CSV: ${csvFilepath}`);
}

main().catch(console.error);
