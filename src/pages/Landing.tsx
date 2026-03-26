import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Wand2, FileText, Presentation, Video, Zap, Palette, CheckCircle, Star } from 'lucide-react';
import { SampleGalleryModal } from '@/components/SampleGalleryModal';
import { sampleData } from '@/data/sampleData';
import type { Sample } from '@/services/sampleRepository';

interface DemoOutput {
  title: string;
  description: string;
  format: string;
  preview: string;
}

export function Landing({ onLaunchApp, onDemoGenerate }: { 
  onLaunchApp: () => void
  onDemoGenerate?: (output: DemoOutput) => void
}) {
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoOutput, setDemoOutput] = useState<DemoOutput | null>(null);
  const [demoPrompt, setDemoPrompt] = useState('Create an infographic on daily hydration — blue and white palette.');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [showSamples, setShowSamples] = useState(false);

  const handleDemoGenerate = async () => {
    setDemoLoading(true);
    try {
      const result: DemoOutput = {
        title: '10 Daily Hydration Tips',
        description: 'A professional infographic explaining the benefits and best practices of staying hydrated throughout the day.',
        format: 'infographic',
        preview: '🎨 Infographic Generated\n\n✓ Blue and white palette applied\n✓ Professional layout with icons and typography\n✓ Data visualization ready\n✓ High-resolution export available'
      };
      setDemoOutput(result);
    } catch (error) {
      console.error('Demo preview failed:', error);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleConfirmGenerate = () => {
    if (demoOutput && onDemoGenerate) {
      onDemoGenerate(demoOutput);
    }
  };

  const handleCancelPreview = () => {
    setDemoOutput(null);
  };

  const handleEarlyAccessSignup = async () => {
    if (!email || !email.includes('@')) {
      setEmailMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setEmailLoading(true);
    try {
      // Store locally for now
      const signups = JSON.parse(localStorage.getItem('doneanddone_signups') || '[]');
      if (signups.includes(email.toLowerCase())) {
        setEmailMessage({ type: 'success', text: "✓ You're already on the list!" });
      } else {
        signups.push(email.toLowerCase());
        localStorage.setItem('doneanddone_signups', JSON.stringify(signups));
        console.log('[Early Access Signup]', email);
        setEmailMessage({ type: 'success', text: '✓ Thanks! Check your email for early access updates.' });
        setEmail('');
      }
      setTimeout(() => setEmailMessage(null), 5000);
    } catch (error) {
      setEmailMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-10 w-[400px] h-[400px] bg-chart-2/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fade-in">
            Create anything from
            <span className="block bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent mt-3">
              a single line.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground animate-fade-in max-w-2xl mx-auto leading-relaxed">
            Infographics, videos, presentations, or reports — just describe what you need, and DoneandDone delivers a polished, ready-to-use output in one go.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button 
              size="lg" 
              onClick={onLaunchApp}
              className="group text-lg px-8 py-6 rounded-xl"
            >
              Try it now
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 rounded-xl"
              onClick={() => setShowSamples(true)}
            >
              See examples
            </Button>
          </div>

          <p className="text-sm text-muted-foreground animate-fade-in">
            Try: "Design a 30-second video on World Heart Day."
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent to-secondary/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 tracking-tight">
            How DoneandDone Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: 'Type it.',
                description: 'Write what you want — one simple line. Example: "Create a poster for World Stroke Day, red and yellow palette."'
              },
              {
                icon: Wand2,
                title: 'We create.',
                description: 'The AI interprets your intent, selects layout, design, tone, and builds it automatically.'
              },
              {
                icon: CheckCircle,
                title: 'Download.',
                description: 'Instantly get your final output — ready to publish, share, or edit.'
              }
            ].map((step, idx) => (
              <div key={idx} className="bg-card/50 backdrop-blur-sm border rounded-2xl p-8 hover:border-primary/50 transition-colors">
                <step.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Formats Section */}
      <section id="formats-section" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 tracking-tight">
            One app, infinite formats.
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-16">
            Whatever you imagine, DoneandDone can make it.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { icon: Palette, title: 'Infographics', desc: 'Explain ideas visually.' },
              { icon: Video, title: 'Videos', desc: 'Tell stories that move.' },
              { icon: Presentation, title: 'Presentations', desc: 'Slides that speak for you.' },
              { icon: FileText, title: 'Documents', desc: 'Professional, polished reports.' },
              { icon: Star, title: 'Social Posts', desc: 'Scroll-stopping designs for every platform.' }
            ].map((format, idx) => (
              <div key={idx} className="group bg-card/50 backdrop-blur-sm border rounded-xl p-6 hover:border-primary/50 transition-all hover:shadow-lg">
                <format.icon className="w-10 h-10 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold mb-2">{format.title}</h3>
                <p className="text-sm text-muted-foreground">{format.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-secondary/20 to-transparent">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 tracking-tight">
            See it in action.
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12">
            Type a prompt below to preview what DoneandDone can do.
          </p>

          <div className="bg-card/80 backdrop-blur-sm border rounded-2xl p-8 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Demo Prompt</label>
                {!demoOutput && (
                  <button
                    onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                    className="text-xs px-3 py-1 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-primary font-medium"
                  >
                    {isEditingPrompt ? 'Done Editing' : 'Edit'}
                  </button>
                )}
              </div>
              {isEditingPrompt && !demoOutput ? (
                <Input
                  placeholder="Enter your custom prompt..."
                  value={demoPrompt}
                  onChange={(e) => setDemoPrompt(e.target.value)}
                  className="text-base py-6 rounded-xl"
                  autoFocus
                />
              ) : (
                <Input
                  placeholder="Create an infographic summarizing the REAL-WORLD ADHERENCE data for a new GLP-1."
                  value={demoPrompt}
                  className="text-base py-6 rounded-xl"
                  readOnly
                />
              )}
            </div>

            {!demoOutput ? (
              <>
                <Button 
                  onClick={handleDemoGenerate}
                  disabled={demoLoading}
                  className="w-full text-base py-6 rounded-xl"
                >
                  {demoLoading ? 'Creating magic...' : 'Generate Preview'}
                  {!demoLoading && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-secondary/30 border border-primary/20 rounded-xl p-8 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{demoOutput.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{demoOutput.description}</p>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">{demoOutput.preview}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">Looks good? Confirm to generate or try your own prompt.</p>
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleCancelPreview}
                      variant="outline"
                      size="lg"
                      className="flex-1 text-base py-6 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleConfirmGenerate}
                      size="lg"
                      className="flex-1 text-base py-6 rounded-xl"
                    >
                      Confirm & Generate
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                  <Button 
                    onClick={onLaunchApp}
                    variant="ghost"
                    size="lg"
                    className="w-full text-base py-6 rounded-xl"
                  >
                    Or try your own prompt
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why DoneandDone Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 tracking-tight">
            Why creators love DoneandDone
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                emoji: '🪄',
                title: 'Instant Creation',
                description: 'Your ideas become finished assets in seconds.'
              },
              {
                emoji: '🎨',
                title: 'No Design Skills Needed',
                description: 'The app handles layout, colors, and tone automatically.'
              },
              {
                emoji: '🔁',
                title: 'One Try. One Result.',
                description: 'Every output is final — no back-and-forth or drafts.'
              },
              {
                emoji: '🧠',
                title: 'Learns You',
                description: 'DoneandDone adapts to your brand\'s style and preferences over time.'
              }
            ].map((benefit, idx) => (
              <div key={idx} className="bg-card/50 backdrop-blur-sm border rounded-2xl p-8 hover:border-primary/50 transition-colors">
                <div className="text-5xl mb-4">{benefit.emoji}</div>
                <h3 className="text-2xl font-bold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent to-secondary/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 tracking-tight">
            Early users call it "magic."
          </h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              '"I made a full campaign in under a minute — unbelievable."',
              '"This feels like having a design, copy, and tech team in one."',
              '"Finally, an AI tool that actually finishes the job."'
            ].map((quote, idx) => (
              <div key={idx} className="bg-card/50 backdrop-blur-sm border rounded-2xl p-8">
                <p className="text-lg italic text-foreground leading-relaxed">{quote}</p>
              </div>
            ))}
          </div>

          <div className="bg-card/80 backdrop-blur-sm border rounded-2xl p-8 space-y-4">
            <p className="text-center text-muted-foreground mb-2">
              Join early users turning ideas into outcomes.
            </p>
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter your email for early access."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEarlyAccessSignup()}
                className="py-6 rounded-xl text-base"
              />
              <Button 
                onClick={handleEarlyAccessSignup}
                disabled={emailLoading}
                className="px-8 py-6 rounded-xl whitespace-nowrap"
              >
                {emailLoading ? 'Signing up...' : 'Get Access'}
              </Button>
            </div>
            {emailMessage && (
              <p className={`text-sm text-center ${
                emailMessage.type === 'success' 
                  ? 'text-chart-3' 
                  : 'text-destructive'
              }`}>
                {emailMessage.text}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4 bg-card/50">
        <div className="max-w-6xl mx-auto text-center space-y-2">
          <h3 className="text-2xl font-bold">DoneandDone</h3>
          <p className="text-muted-foreground">Ideas. Instantly.</p>
        </div>
      </footer>

      {/* Sample Gallery Modal */}
      <SampleGalleryModal 
        samples={sampleData}
        open={showSamples}
        onOpenChange={setShowSamples}
      />
    </div>
  );
}
