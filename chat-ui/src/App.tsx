import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { 
  Send, User, Bot, MessageSquarePlus, FileText, 
  Search, GraduationCap, Settings, HelpCircle, Clock, 
  ArrowRight, Landmark, Banknote 
} from 'lucide-react';
import './index.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am EduLoans AI. I can help you evaluate loan profiles, search for eligible lenders, check universities, and more. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:4000/api/chat', {
        messages: [...messages, userMessage]
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.response?.data?.error || error.message || 'Something went wrong.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>EduLoans AI</h2>
          <p>Sophisticated Advisor</p>
        </div>
        
        <div className="sidebar-nav">
          <button className="nav-item active action-btn">
            <MessageSquarePlus size={18} />
            <span>New Chat</span>
          </button>
          <button className="nav-item">
            <FileText size={18} />
            <span>Loan Profile</span>
          </button>
          <button className="nav-item">
            <Search size={18} />
            <span>Lender Search</span>
          </button>
          <button className="nav-item">
            <GraduationCap size={18} />
            <span>University Check</span>
          </button>
          <button className="nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <button className="upgrade-btn">Upgrade to Pro</button>
          <button className="nav-item">
            <HelpCircle size={18} />
            <span>Help</span>
          </button>
          <button className="nav-item">
            <Clock size={18} />
            <span>History</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="main-header">
          <h1>Welcome, Student</h1>
          <p>How can I assist with your educational financing today?</p>
        </div>

        <div className="quick-cards">
          <div className="action-card">
            <div className="card-icon-row">
              <div className="icon-wrapper blue"><Banknote size={24} color="#3b82f6" /></div>
              <ArrowRight size={20} className="arrow" />
            </div>
            <h3>Find a Loan</h3>
            <p>Personalized lender matching based on your university and credit profile.</p>
          </div>
          <div className="action-card">
            <div className="card-icon-row">
              <div className="icon-wrapper indigo"><Landmark size={24} color="#6366f1" /></div>
              <ArrowRight size={20} className="arrow" />
            </div>
            <h3>Loan Profile</h3>
            <p>Upload documents and finalize your digital financing passport.</p>
          </div>
        </div>

        {/* Chat Section */}
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-bot-icon">
              <Bot size={24} color="white" />
            </div>
            <div>
              <h3>EduLoans AI Assistant</h3>
              <p>Powered by Gemini & MCP</p>
            </div>
          </div>
          
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role === 'user' ? 'user' : 'bot'}`}>
                <div className="avatar">
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className="message-content">
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message bot">
                <div className="avatar"><Bot size={18} /></div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <form className="input-form" onSubmit={handleSubmit}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about education loans..."
                disabled={isLoading}
              />
              <button type="submit" disabled={!input.trim() || isLoading} className="send-btn">
                <Send size={18} />
              </button>
            </form>
            <div className="quick-chips">
              <button className="chip">Compare Rates</button>
              <button className="chip">Eligibility Check</button>
              <button className="chip">University List</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
