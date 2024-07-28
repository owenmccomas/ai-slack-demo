import type { NextApiRequest, NextApiResponse } from 'next'
import { processUserQuery } from "@/utils/user-interpret-ai";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const userInput = req.body.input;
      if (typeof userInput !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
      }
      const result = await processUserQuery(userInput);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error processing query:', error);
      res.status(500).json({ error: 'An error occurred while processing the query' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}