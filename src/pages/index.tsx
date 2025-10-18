import { useState, useEffect } from 'react';

interface Message {
  role: string;
  content: string;
  createdAt: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingSessionId = localStorage.getItem('chatSessionId');
    if (existingSessionId) {
      setSessionId(existingSessionId);
      loadChatHistory(existingSessionId);
    } else {
      const newSessionId = Date.now().toString();
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
    }
  }, []);

  const loadChatHistory = async (sid: string) => {
    try {
      const response = await fetch(`/api/history?sessionId=${sid}`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);
    const userMessage = input;
    setInput('');

    const newMessage: Message = {
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Multi-Agent Chatbot</h1>
          <p className="text-gray-600">Ask me about programming, math, or general questions!</p>
        </div>

        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                <p className="text-sm">Thinking...</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}