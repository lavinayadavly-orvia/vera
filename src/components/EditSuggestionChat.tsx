import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { generateText } from '@/lib/openai';
import { analyticsService } from '@/services/analytics';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface EditSuggestionChatProps {
  generationId: string;
  currentOutput: any;
  onEditApplied?: (newOutput: any) => void;
}

export function EditSuggestionChat({ generationId, currentOutput, onEditApplied }: EditSuggestionChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your edit assistant. Describe specific changes you'd like to make, and I'll help refine your output. For example:\n\n• \"Make the title more catchy\"\n• \"Change the color scheme to warmer tones\"\n• \"Add more data points in section 2\"\n• \"Simplify the language for general audience\"",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      await analyticsService.trackEvent({
        eventType: 'refinement_started',
        contentType: currentOutput?.contentType,
        metadata: { generationId, suggestionLength: userMessage.content.length }
      });

      const aiResponse = await processEditSuggestion(userMessage.content, currentOutput);

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (aiResponse.hasChanges && onEditApplied) {
        onEditApplied(aiResponse.updatedOutput);
      }
    } catch (error) {
      console.error('Failed to process edit suggestion:', error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your suggestion. Please try rephrasing your request or try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          Edit Assistant
        </CardTitle>
        <CardDescription className="text-xs">Chat with AI to refine your output</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollRef} className="flex-1 px-4">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <span className="text-[10px] opacity-70 mt-1 block">{new Date(message.timestamp).toLocaleTimeString()}</span>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Describe the changes you want..." className="resize-none text-sm" rows={2} disabled={isProcessing} />
            <Button onClick={handleSendMessage} disabled={!input.trim() || isProcessing} size="sm" className="self-end">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Press Enter to send • Shift+Enter for new line</p>
        </div>
      </CardContent>
    </Card>
  );
}

async function processEditSuggestion(
  suggestion: string,
  currentOutput: any
): Promise<{ message: string; hasChanges: boolean; updatedOutput?: any }> {
  try {
    const { text } = await generateText({
      prompt: `You are an expert content editor helping a user refine their generated content.\n\nCurrent Output:\n${JSON.stringify(currentOutput, null, 2)}\n\nUser's Edit Request:\n"${suggestion}"\n\nAnalyze the request and provide:\n1. A clear explanation of what changes you understand they want\n2. Specific suggestions on how to implement these changes\n3. Whether this requires regeneration or can be done manually\n\nBe helpful, concise, and actionable. If the request is vague, ask clarifying questions.\nFormat your response in a friendly, conversational tone.`,
      maxTokens: 500
    });
    return { message: text, hasChanges: false, updatedOutput: currentOutput };
  } catch (error) {
    console.error('AI processing error:', error);
    throw error;
  }
}
