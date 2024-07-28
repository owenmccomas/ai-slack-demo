import React, { useState, useEffect } from "react";
import { Table } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
import Papa from "papaparse";


interface Message {
  Timestamp: string;
  User: string;
  Message: string;
  client_msg_id?: string;
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const CSVVisualizer: React.FC<{ channelName: string | null }> = ({ channelName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCSV = async () => {
      if (!channelName) {
        setError('No channel name provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/slack-csv?channelName=${channelName}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        const { data, errors } = Papa.parse<Message>(text, { header: true });
        
        if (errors.length > 0) {
          console.warn('Parse errors:', errors);
        }
        
        if (data.length === 0) {
          setError('No data found in the CSV file.');
        } else {
          setMessages(data);
        }
      } catch (error) {
        console.error('Error fetching or parsing CSV:', error);
        setError('Failed to load data. Please check the console for more details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCSV();
  }, [channelName]);

  const openInSlack = (client_msg_id: string) => {
    // This is a placeholder URL. Replace it with the correct Slack deep link format.
    const slackUrl = `slack://message?team=TEAM_ID&id=${client_msg_id}`;
    window.open(slackUrl, "_blank");
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500">
        <p>{error}</p>
        <p>Attempted to load file for channel: {channelName}</p>
        <p>Please ensure the file exists and is accessible.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Timestamp</th>
            <th className="px-4 py-2 text-left">User</th>
            <th className="px-4 py-2 text-left">Message</th>
            {/* <th className="px-4 py-2 text-left">Action</th> */}
          </tr>
        </thead>
        <tbody>
          {messages.map((msg, index) => (
            <tr
              key={index}
              className={
                index % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100"
              }
            >
              <td className="px-4 py-2">
                {msg.Timestamp
                  ? formatTimestamp(msg.Timestamp)
                  : "No timestamp"}
              </td>
              <td className="px-4 py-2">{msg.User || "Unknown user"}</td>
              <td className="px-4 py-2">
                {msg.Message
                  ? msg.Message.length > 100
                    ? `${msg.Message.substring(0, 100)}...`
                    : msg.Message
                  : "No message content"}
              </td>
              <td className="px-4 py-2">
                {/* {msg.client_msg_id ? (
                  <Button onClick={() => openInSlack(msg.client_msg_id)}>
                    Open in Slack
                  </Button>
                ) : (
                  "No link available"
                )} */}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default CSVVisualizer;
