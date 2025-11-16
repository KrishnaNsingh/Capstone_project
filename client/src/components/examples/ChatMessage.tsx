import ChatMessage from "../ChatMessage";

export default function ChatMessageExample() {
  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <ChatMessage
        role="user"
        content="What are the main topics covered in this document?"
        timestamp={new Date(Date.now() - 60000)}
      />
      
      <ChatMessage
        role="assistant"
        content="Based on the document, the main topics covered include machine learning fundamentals, neural networks, deep learning architectures, and practical applications in computer vision and natural language processing."
        timestamp={new Date()}
      />
      
      <ChatMessage
        role="user"
        content="Can you explain neural networks in more detail?"
      />
    </div>
  );
}
