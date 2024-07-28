import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { channelName } = req.query;
  
  if (typeof channelName !== 'string') {
    return res.status(400).json({ error: 'Invalid channel name' });
  }

  const filePath = path.join(process.cwd(), 'data', 'slack-output', `${channelName}_messages.csv`);

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${channelName}_messages.csv`);
    res.status(200).send(fileContents);
  } catch (error) {
    console.error('Error reading CSV file:', error);
    res.status(404).json({ error: 'CSV file not found' });
  }
}