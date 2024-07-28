import Head from "next/head";
import Chat from "@/components/Chat";

export default function Home() {
  return (
    <>
      <Head>
        <title>Slack AI Demo</title>
        <meta name="description" content="A demo of using OpenAI's ChatGPT API to analyze Slack messages." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <Chat />
      </main>
    </>
  );
}