import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowRight,
  CheckCircle,
  FileAudio2,
  FileText,
  Layers3,
  Palette,
  Presentation,
  ScanSearch,
  ShieldCheck,
  Video,
  Wand2,
} from 'lucide-react';
import { SampleGalleryModal } from '@/components/SampleGalleryModal';
import { VeraLogoMark } from '@/components/VeraLogo';
import { HeroFormatFlow } from '@/components/HeroFormatFlow';
import { sampleData } from '@/data/sampleData';

interface DemoOutput {
  title: string;
  description: string;
  format: string;
  preview: string;
}

const SIGNUPS_KEY = 'vera_signups';
const LEGACY_SIGNUPS_KEY = ['done', 'anddone', 'signups'].join('_');

const STUDIO_PILLARS = [
  {
    icon: ScanSearch,
    eyebrow: 'Source-aware',
    title: 'The line is interpreted before anything is designed.',
    body: 'Vera turns a brief into structure, format intent, and evidence expectations before it starts writing or rendering.',
  },
  {
    icon: Layers3,
    eyebrow: 'Format-native',
    title: 'Each format behaves like its own production track.',
    body: 'Presentations, reports, podcasts, infographics, and video packages are handled as different output systems, not one generic template.',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Review-ready',
    title: 'The output is shaped for teams that care about sign-off.',
    body: 'Tone, market context, and delivery expectations stay attached so the result feels usable, not speculative.',
  },
];

const FORMAT_RUNWAY = [
  {
    title: 'Presentations',
    deliverable: 'Slide narratives and native decks',
    body: 'Designed for leadership reviews, MSL conversations, and structured story flow.',
    icon: Presentation,
    accent: 'from-primary/15 via-primary/5 to-transparent',
    border: 'border-primary/25',
  },
  {
    title: 'Infographics',
    deliverable: 'Visual explainers and poster layouts',
    body: 'High-signal layouts for mechanisms, pathways, frameworks, and summary content.',
    icon: Palette,
    accent: 'from-chart-2/15 via-chart-2/5 to-transparent',
    border: 'border-chart-2/25',
  },
  {
    title: 'Video + audio',
    deliverable: 'Scripts, narration, and render-ready packages',
    body: 'Built for motion narratives, explainers, podcasts, and short-form storytelling.',
    icon: Video,
    accent: 'from-chart-3/20 via-primary/5 to-transparent',
    border: 'border-chart-3/30',
  },
  {
    title: 'Reports + documents',
    deliverable: 'Long-form structured writing',
    body: 'White papers, briefs, reports, and polished written deliverables from the same system.',
    icon: FileText,
    accent: 'from-foreground/5 via-transparent to-transparent',
    border: 'border-border/70',
  },
];

const STUDIO_STEPS = [
  {
    label: '01',
    title: 'Brief',
    body: 'Start with one sentence. Tone, format, and output path can be refined afterward.',
  },
  {
    label: '02',
    title: 'Orchestrate',
    body: 'Vera translates that sentence into format logic, source expectations, and a production route.',
  },
  {
    label: '03',
    title: 'Deliver',
    body: 'The result comes back as a real output path, not just a generic block of text.',
  },
];

const SECTION_NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'system', label: 'Why Vera' },
  { id: 'formats', label: 'Formats' },
  { id: 'preview', label: 'Preview' },
  { id: 'access', label: 'Access' },
];

export function Landing({
  onLaunchApp,
  onDemoGenerate,
}: {
  onLaunchApp: () => void;
  onDemoGenerate?: (output: DemoOutput) => void;
}) {
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoOutput, setDemoOutput] = useState<DemoOutput | null>(null);
  const [demoPrompt, setDemoPrompt] = useState('Turn a one-line brief on World Heart Day into a presentation and a social-ready infographic.');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [showSamples, setShowSamples] = useState(false);

  const handleDemoGenerate = async () => {
    setDemoLoading(true);
    try {
      const result: DemoOutput = {
        title: 'World Heart Day Campaign Package',
        description: 'A coordinated concept showing how one line can expand into a presentation, infographic, and campaign-ready narrative.',
        format: 'multi-format',
        preview:
          'Presentation spine locked\nInfographic headline and zones mapped\nVideo-ready narrative beats drafted\nReview cues attached for the next step',
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
      const next = localStorage.getItem(SIGNUPS_KEY);
      const legacy = localStorage.getItem(LEGACY_SIGNUPS_KEY);
      const signups = Array.from(
        new Set([...(next ? JSON.parse(next) : []), ...(legacy ? JSON.parse(legacy) : [])]),
      );
      if (signups.includes(email.toLowerCase())) {
        setEmailMessage({ type: 'success', text: "✓ You're already on the list!" });
      } else {
        signups.push(email.toLowerCase());
        localStorage.setItem(SIGNUPS_KEY, JSON.stringify(signups));
        console.log('[Early Access Signup]', email);
        setEmailMessage({ type: 'success', text: '✓ Thanks. We will send access updates here.' });
        setEmail('');
      }
      setTimeout(() => setEmailMessage(null), 5000);
    } catch (error) {
      setEmailMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7fbfb_40%,#f0f7f7_100%)] text-foreground dark:bg-[linear-gradient(180deg,#07171d_0%,#0b2028_26%,#0c3137_62%,#0d4648_100%)] dark:text-white">
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfb_44%,#eff7f7_100%)] px-4 pb-20 pt-10 dark:bg-[linear-gradient(135deg,#051319_0%,#0b2731_42%,#0f6a6d_100%)] md:pb-28 md:pt-12">
        <div className="absolute inset-0">
          <div className="absolute -left-16 top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/14" />
          <div className="absolute right-[-6rem] top-4 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-400/16" />
          <div className="absolute bottom-[-7rem] left-[32%] h-80 w-80 rounded-full bg-orange-400/10 blur-3xl dark:bg-orange-400/12" />
          <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(11,79,88,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(11,79,88,0.08)_1px,transparent_1px)] [background-size:88px_88px] dark:opacity-35 dark:[background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)]" />
          <div className="absolute inset-x-[8%] top-10 h-[1px] bg-gradient-to-r from-transparent via-[#0B4F58]/12 to-transparent dark:via-white/18" />
          <div className="absolute inset-y-[8%] left-[8%] w-[1px] bg-gradient-to-b from-transparent via-[#0B4F58]/10 to-transparent dark:via-white/14" />
        </div>

        <div className="relative left-1/2 mb-16 w-screen -translate-x-1/2 overflow-hidden border-y border-[#0B4F58]/10 bg-[linear-gradient(115deg,rgba(255,255,255,0.96),rgba(243,251,250,0.96),rgba(255,246,238,0.95))] text-foreground shadow-[0_24px_90px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/10 dark:bg-[linear-gradient(115deg,rgba(2,6,23,0.9),rgba(5,46,68,0.78),rgba(15,118,110,0.68))] dark:text-background dark:shadow-[0_24px_90px_rgba(2,6,23,0.34)]">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(11,79,88,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(11,79,88,0.06)_1px,transparent_1px)] [background-size:64px_64px] dark:opacity-25 dark:[background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)]" />
          <div className="absolute inset-y-0 left-0 w-[28%] bg-[radial-gradient(circle_at_left,rgba(249,115,22,0.1),transparent_56%)] dark:bg-[radial-gradient(circle_at_left,rgba(249,115,22,0.18),transparent_56%)]" />
          <div className="relative w-full">
            <div className="grid lg:grid-cols-[300px_minmax(0,1fr)_380px] lg:items-stretch">
              <div className="flex flex-col justify-center border-b border-[#0B4F58]/10 px-6 py-6 sm:px-7 lg:border-b-0 lg:border-r lg:px-10 dark:border-white/10">
                <div className="bg-gradient-to-r from-orange-500 via-[#0B4F58] to-teal-500 bg-clip-text text-[2.4rem] font-semibold tracking-[0.34em] text-transparent drop-shadow-[0_0_18px_rgba(13,148,136,0.08)] md:text-[3.2rem] dark:from-orange-200 dark:via-cyan-100 dark:to-teal-200 dark:drop-shadow-[0_0_18px_rgba(125,211,252,0.16)]">
                  VERA
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-[#0B4F58]/62 dark:text-cyan-100/70">
                  Creative content playground
                </p>
              </div>

              <div className="flex items-center border-b border-[#0B4F58]/10 px-6 py-6 sm:px-7 lg:border-b-0 lg:border-r lg:px-10 dark:border-white/10">
                <div className="flex items-center gap-4">
                  <VeraLogoMark className="h-12 w-12 rounded-2xl shadow-sm" />
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/40 bg-orange-50 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.28em] text-orange-700 dark:border-orange-300/25 dark:bg-orange-400/10 dark:text-orange-100">
                      <span>Vera</span>
                      <span className="h-1 w-1 rounded-full bg-orange-500 dark:bg-orange-300" />
                      <span>Live Studio</span>
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="max-w-3xl text-[1.9rem] font-semibold leading-tight tracking-[-0.05em] text-[#0B4F58] md:text-[2.15rem] dark:text-white">
                        Welcome to Vera!
                      </h2>
                      <p className="text-lg italic leading-none text-[#0B4F58]/72 md:text-[1.15rem] dark:text-cyan-100/82">
                        Your own creative content playground!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 px-6 py-6 sm:grid-cols-3 sm:px-7 lg:px-8">
                {[
                  { label: 'Prompt in', value: 'one line' },
                  { label: 'Outputs', value: 'deck • video • doc' },
                  { label: 'Mode', value: 'studio-ready' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[#0B4F58]/10 bg-white/86 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/6">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B4F58]/54 dark:text-cyan-100/70">{item.label}</div>
                    <div className="mt-2 text-sm font-semibold text-foreground dark:text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[#0B4F58]/10 px-6 py-4 text-[11px] uppercase tracking-[0.2em] text-[#0B4F58]/66 dark:border-white/10 dark:text-background/72 sm:px-7 lg:px-8">
              <span>Presentation</span>
              <span className="text-orange-500 dark:text-orange-300">Infographic</span>
              <span>Video</span>
              <span className="text-orange-500 dark:text-orange-300">Podcast</span>
              <span>White Paper</span>
              <span className="text-orange-500 dark:text-orange-300">Source-aware</span>
              <span>Multi-format output</span>
            </div>
          </div>
        </div>

        <div className="relative z-20 mx-auto mb-10 max-w-[1640px] px-6 md:px-10 xl:px-14">
          <div className="sticky top-3">
            <div className="inline-flex flex-wrap gap-2 rounded-full border border-[#0B4F58]/12 bg-white/88 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-[#08242c]/72 dark:shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
              {SECTION_NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="rounded-full border border-transparent px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#0B4F58]/72 transition-all hover:border-[#0B4F58]/12 hover:bg-teal-50 hover:text-[#0B4F58] dark:text-cyan-50/72 dark:hover:border-white/12 dark:hover:bg-white/8 dark:hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div id="overview" className="relative mx-auto max-w-[1640px] scroll-mt-24 px-6 md:px-10 xl:px-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(480px,0.98fr)_minmax(500px,1.02fr)] lg:items-center xl:grid-cols-[minmax(540px,0.92fr)_minmax(660px,1.08fr)] xl:gap-12">
            <div className="space-y-8 lg:max-w-[48rem] lg:pl-[48px] xl:pl-[72px]">
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-[#0B4F58]/58 dark:text-white/62">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#0B4F58]/10 bg-white/84 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/14 dark:bg-white/8">
                  <VeraLogoMark transparent className="h-5 w-5" />
                  Vera Studio
                </span>
                <span>Multi-format output</span>
              </div>

              <div className="space-y-6">
                <p className="max-w-[46rem] text-sm font-medium uppercase tracking-[0.25em] text-orange-300">
                  One sentence in. A full content system out.
                </p>
                <h1 className="max-w-none text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-foreground md:text-7xl lg:text-[4.7rem] xl:text-[5.7rem] dark:text-white">
                  Vera doesn&apos;t feel like a prompt box.
                  <span className="mt-3 block font-serif text-[0.92em] italic text-[#0B4F58] dark:text-cyan-200">
                    It feels like a creative playground.
                  </span>
                </h1>
                <p className="max-w-[42rem] text-lg leading-8 text-foreground/72 md:text-xl dark:text-cyan-50/82">
                  Start with one clean line. Vera routes it into presentations, reports, infographics, video, audio,
                  and social-ready deliverables with structure, direction, and output intent already attached.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" onClick={onLaunchApp} className="group rounded-full px-8 py-6 text-base shadow-[0_18px_50px_rgba(249,115,22,0.35)]">
                  Open Vera
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-[#0B4F58]/14 bg-white/88 px-8 py-6 text-base text-foreground backdrop-blur-sm hover:bg-white hover:text-foreground dark:border-white/16 dark:bg-white/8 dark:text-white dark:hover:bg-white/12 dark:hover:text-white"
                  onClick={() => setShowSamples(true)}
                >
                  Browse sample outputs
                </Button>
              </div>

              <div className="grid gap-4 pt-3 lg:grid-cols-[minmax(0,1.04fr)_260px]">
                <div className="rounded-[28px] border border-orange-200/80 bg-white/92 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/12 dark:bg-white/8 dark:shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
                  <div className="flex items-center justify-between border-b border-orange-200/70 pb-3 text-xs uppercase tracking-[0.22em] text-[#0B4F58]/54 dark:border-white/10 dark:text-cyan-50/54">
                    <span>Input sample</span>
                    <span>Live brief style</span>
                  </div>
                  <div className="pt-4 font-mono text-sm leading-7 text-foreground/88 md:text-[15px] dark:text-cyan-50/88">
                    “Make a clean HCP presentation on World Hypertension Day, then adapt the core narrative into a
                    podcast opener and an infographic.”
                  </div>
                </div>

                <div className="rounded-[28px] border border-teal-200/80 bg-teal-50/84 p-5 shadow-[0_20px_60px_rgba(4,120,87,0.08)] backdrop-blur-sm dark:border-emerald-300/18 dark:bg-emerald-400/8 dark:shadow-[0_20px_60px_rgba(4,120,87,0.14)]">
                  <div className="text-xs uppercase tracking-[0.22em] text-[#0B4F58] dark:text-emerald-200">Studio pulse</div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-sm dark:bg-white/9 dark:text-cyan-50">
                      <span className="text-foreground/60 dark:text-cyan-50/70">Formats handled</span>
                      <span className="font-semibold text-foreground dark:text-cyan-50">deck • doc • audio • video</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-foreground shadow-sm dark:bg-white/9 dark:text-cyan-50">
                      <span className="text-foreground/60 dark:text-cyan-50/70">Starting point</span>
                      <span className="font-semibold text-foreground dark:text-cyan-50">one line</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative lg:justify-self-stretch lg:self-start">
              <div className="absolute -left-8 top-6 hidden h-36 w-36 rounded-full border border-primary/18 lg:block" />
              <div className="absolute -right-6 bottom-20 hidden h-32 w-32 rounded-full border border-chart-2/18 lg:block" />
              <HeroFormatFlow />
            </div>
          </div>
        </div>
      </section>

      <section id="system" className="relative -mt-8 scroll-mt-24 px-4 py-10 md:-mt-12 md:py-16">
        <div className="mx-auto max-w-[1600px] px-5 md:px-8 xl:px-10">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[34px] border border-teal-100 bg-white/92 px-8 py-10 text-foreground shadow-[0_32px_120px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/8 dark:bg-[linear-gradient(145deg,rgba(7,21,26,0.96),rgba(12,39,49,0.92),rgba(15,77,84,0.86))] dark:text-background dark:shadow-[0_32px_120px_rgba(21,16,10,0.22)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0B4F58]/62 dark:text-background/65">Studio logic</p>
              <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight text-[#0B4F58] md:text-4xl dark:text-white">
                Built as a content operating system for teams creating across formats.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-foreground/72 md:text-base dark:text-background/72">
                One brief enters the system. Several output tracks come back with their own shape, pace, and
                deliverable logic.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {STUDIO_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-[28px] border border-teal-100 bg-white/88 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/55 dark:bg-white/74 dark:shadow-[0_28px_70px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/18 to-chart-2/18 text-primary">
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{pillar.eyebrow}</p>
                  <h3 className="mt-3 text-xl font-semibold leading-snug text-[#0B4F58] dark:text-foreground">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{pillar.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="formats" className="scroll-mt-24 px-4 py-14 md:py-20">
        <div className="mx-auto max-w-[1600px] px-5 md:px-8 xl:px-10">
          <div className="flex flex-col gap-4 pb-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Format runway</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#0B4F58] md:text-5xl dark:text-foreground">
                One idea can leave the system in very different shapes.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Presentations, visuals, audio, and documents each leave with their own structure, pace, and delivery style.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {FORMAT_RUNWAY.map((item, index) => (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-[32px] border ${item.border} bg-white/88 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.06)] backdrop-blur-md ${index === 0 || index === 3 ? 'md:min-h-[280px]' : 'md:min-h-[240px]'}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Output track</p>
                      <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#0B4F58]">{item.title}</h3>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background/85 shadow-sm">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="mt-10 space-y-4">
                    <div className="inline-flex rounded-full border border-foreground/10 bg-background/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {item.deliverable}
                    </div>
                    <p className="max-w-lg text-sm leading-7 text-muted-foreground md:text-base">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preview" className="relative scroll-mt-24 px-4 py-16 md:py-20">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="mx-auto grid max-w-[1600px] gap-6 px-5 md:px-8 lg:grid-cols-[0.88fr_1.12fr] xl:px-10">
          <div className="rounded-[34px] border border-teal-100 bg-white/88 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/55 dark:bg-white/72 dark:shadow-[0_28px_90px_rgba(15,23,42,0.07)]">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">Operating loop</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#0B4F58] md:text-4xl dark:text-foreground">
              A clear workflow from brief to deliverable.
            </h2>
            <div className="mt-8 space-y-5">
              {STUDIO_STEPS.map((step) => (
                <div key={step.label} className="grid grid-cols-[56px_1fr] gap-4 rounded-[24px] border border-border/60 bg-secondary/35 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-background">
                    {step.label}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#0B4F58] dark:text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[34px] border border-orange-100 bg-gradient-to-br from-white/90 to-orange-50/56 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/55 dark:bg-gradient-to-br dark:from-white/76 dark:to-white/54 dark:shadow-[0_28px_90px_rgba(15,23,42,0.07)]">
            <div className="flex flex-col gap-3 border-b border-border/60 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-primary">Live studio preview</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0B4F58] dark:text-foreground">Preview the pipeline</h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-muted-foreground">
                See how one brief expands into a coordinated multi-format content package.
              </p>
            </div>

            <div className="mt-7 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Working brief</label>
                  {!demoOutput && (
                    <button
                      onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {isEditingPrompt ? 'Done editing' : 'Edit brief'}
                    </button>
                  )}
                </div>

                {isEditingPrompt && !demoOutput ? (
                  <Input
                    placeholder="Enter your custom prompt..."
                    value={demoPrompt}
                    onChange={(e) => setDemoPrompt(e.target.value)}
                    className="rounded-2xl border-foreground/10 bg-background/85 py-6 text-base"
                    autoFocus
                  />
                ) : (
                  <div className="rounded-[24px] border border-foreground/10 bg-foreground px-5 py-5 font-mono text-sm leading-7 text-background shadow-[0_18px_60px_rgba(21,16,10,0.15)]">
                    {demoPrompt}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Formats</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { label: 'Slides', icon: Presentation },
                        { label: 'Infographic', icon: Palette },
                        { label: 'Podcast', icon: FileAudio2 },
                      ].map((chip) => (
                        <div key={chip.label} className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-medium">
                          <chip.icon className="h-3.5 w-3.5" />
                          {chip.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Outcome</div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      One coordinated brief, several deliverable-ready directions.
                    </p>
                  </div>
                </div>

                {!demoOutput ? (
                  <Button onClick={handleDemoGenerate} disabled={demoLoading} className="w-full rounded-full py-6 text-base shadow-lg shadow-primary/15">
                    {demoLoading ? 'Building preview...' : 'Generate studio preview'}
                    {!demoLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Button onClick={handleCancelPreview} variant="outline" size="lg" className="flex-1 rounded-full py-6 text-base">
                        Reset
                      </Button>
                      <Button onClick={handleConfirmGenerate} size="lg" className="flex-1 rounded-full py-6 text-base">
                        Open in Vera
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                    <Button onClick={onLaunchApp} variant="ghost" size="lg" className="w-full rounded-full py-6 text-base">
                      Use your own brief instead
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-[30px] border border-white/55 bg-white/78 p-5 shadow-[0_16px_46px_rgba(15,23,42,0.05)]">
                {!demoOutput ? (
                  <div className="flex h-full min-h-[320px] flex-col justify-between rounded-[24px] border border-dashed border-border bg-secondary/25 p-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Preview surface</p>
                      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#0B4F58] dark:text-foreground">The first output pass will land here.</h3>
                      <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                        The first pass shows how the same brief can open into a coordinated set of output directions.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { title: 'Deck spine', note: 'story and slide logic' },
                        { title: 'Visual zones', note: 'headline, stat, structure' },
                        { title: 'Audio beats', note: 'spoken narrative direction' },
                      ].map((card) => (
                        <div key={card.title} className="rounded-2xl bg-background/90 p-4 shadow-sm">
                          <p className="text-sm font-semibold">{card.title}</p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-[24px] border border-primary/15 bg-primary/5 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Preview ready</p>
                          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{demoOutput.title}</h3>
                        </div>
                        <div className="rounded-full bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {demoOutput.format}
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-muted-foreground">{demoOutput.description}</p>
                    </div>

                    <div className="rounded-[24px] border border-border/60 bg-secondary/30 p-5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Preview notes</p>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground/85">{demoOutput.preview}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="access" className="scroll-mt-24 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-[1600px] px-5 md:px-8 xl:px-10">
          <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-[36px] border border-teal-100 bg-gradient-to-br from-white/92 via-white/84 to-cyan-50/74 p-8 shadow-[0_30px_110px_rgba(15,23,42,0.06)] backdrop-blur-md dark:border-white/55 dark:bg-gradient-to-br dark:from-white/82 dark:via-white/74 dark:to-cyan-50/78 dark:shadow-[0_30px_110px_rgba(15,23,42,0.07)]">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Why teams start here</p>
              <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-[#0B4F58] md:text-5xl dark:text-foreground">
                A faster start for teams creating across formats.
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {[
                  {
                    icon: Wand2,
                    title: 'Start from a brief',
                    body: 'Move from one-line idea to a clearer content direction without building every output from scratch.',
                  },
                  {
                    icon: CheckCircle,
                    title: 'Create with confidence',
                    body: 'Keep presentations, visuals, documents, and audio aligned inside one coordinated workflow.',
                  },
                ].map((card) => (
                  <div key={card.title} className="rounded-[24px] border border-background/60 bg-background/82 p-5 shadow-sm backdrop-blur-sm">
                    <card.icon className="h-6 w-6 text-primary" />
                    <h3 className="mt-4 text-xl font-semibold text-[#0B4F58] dark:text-foreground">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[36px] border border-orange-100 bg-gradient-to-br from-white/92 via-white/84 to-orange-50/68 p-8 text-foreground shadow-[0_30px_120px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(7,21,26,0.96),rgba(11,39,49,0.93),rgba(12,82,88,0.9))] dark:text-background dark:shadow-[0_30px_120px_rgba(21,16,10,0.2)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0B4F58]/60 dark:text-background/60">Early access</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#0B4F58] md:text-4xl dark:text-white">
                Join the teams shaping how Vera launches.
              </h2>
              <p className="mt-4 text-sm leading-7 text-foreground/72 md:text-base dark:text-background/72">
                If you want to test the product as it becomes a fully functional platform, leave your email here.
              </p>

              <div className="mt-8 space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEarlyAccessSignup()}
                  className="rounded-full border-background/20 bg-background/92 py-6 text-base text-foreground"
                />
                <Button onClick={handleEarlyAccessSignup} disabled={emailLoading} className="w-full rounded-full py-6 text-base">
                  {emailLoading ? 'Adding you...' : 'Request access'}
                </Button>
                {emailMessage && (
                  <p className={`text-sm ${emailMessage.type === 'success' ? 'text-chart-3' : 'text-destructive'}`}>
                    {emailMessage.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/50 bg-white/68 px-4 py-10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 md:flex-row md:items-center md:justify-between md:px-8 xl:px-10">
          <div className="flex items-center gap-3">
            <VeraLogoMark className="h-11 w-11 rounded-2xl shadow-sm" />
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em]">Vera</h3>
              <p className="text-sm text-muted-foreground">One line, many finished directions.</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Built for multi-format creation, not single-format prompting.
          </div>
        </div>
      </footer>

      <SampleGalleryModal samples={sampleData} open={showSamples} onOpenChange={setShowSamples} />
    </div>
  );
}
