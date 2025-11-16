import ChatInput from "../ChatInput";

export default function ChatInputExample() {
  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <div>
        <h3 className="text-sm font-medium mb-2">Active State</h3>
        <ChatInput onSend={(msg) => console.log("Sent:", msg)} />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Disabled State</h3>
        <ChatInput 
          onSend={(msg) => console.log("Sent:", msg)}
          disabled={true}
          placeholder="Upload a PDF to start chatting..."
        />
      </div>
    </div>
  );
}
