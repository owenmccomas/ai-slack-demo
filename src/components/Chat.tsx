import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";
import CSVVisualizer from "@/components/CSVVisualizer";

interface ProcessedQueryResponse {
  answer: string;
  channelName: string | null;
  daysAgo: number;
}

export default function Chat() {
  const [input, setInput] = useState<string>("");
  const [response, setResponse] = useState<ProcessedQueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const mutation = api.slack.processQuery.useMutation({
    onSuccess: (data: string | ProcessedQueryResponse) => {
      setIsLoading(false);
      if (typeof data === 'string') {
        setResponse({
          answer: data,
          channelName: null,
          daysAgo: 0
        });
      } else {
        setResponse(data);
      }
    },
    onError: (error) => {
      setResponse({
        answer: `Error: ${error.message}`,
        channelName: null,
        daysAgo: 0
      });
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    mutation.mutate(input);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Slack messages... (e.g., 'What were the most discussed topics in the marketing channel over the last week?')"
            className="min-h-[40px] resize-none rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            className="self-end rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Submit"}
          </Button>
        </form>
        {response && (
          <div className="rounded-md border border-gray-200 bg-white p-4 text-gray-800 shadow-sm">
            <p>{response.answer}</p>
            {response.channelName && (
              <p className="mt-2 text-sm text-gray-600">
                Channel: {response.channelName}, Days analyzed: {response.daysAgo}
              </p>
            )}
          </div>
        )}
      </div>
      {response && response.channelName && (
        <CSVVisualizer channelName={response.channelName} />
      )}
    </div>
  );
}