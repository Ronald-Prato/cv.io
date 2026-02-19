import { ChatPanel } from "@/components/chat-panel";

type CvChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CvChatPage({ params }: CvChatPageProps) {
  const { id } = await params;

  return <ChatPanel cvId={id} />;
}
