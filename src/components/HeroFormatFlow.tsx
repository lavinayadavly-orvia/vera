import {
  FileAudio2,
  FileText,
  ImageIcon,
  LayoutTemplate,
  PlayCircle,
} from 'lucide-react';

const OUTPUTS = [
  {
    label: 'Video',
    eyebrow: 'Rendered narrative',
    icon: PlayCircle,
    accent: 'from-orange-400/22 to-transparent',
  },
  {
    label: 'Podcast',
    eyebrow: 'Voice + audio flow',
    icon: FileAudio2,
    accent: 'from-cyan-400/20 to-transparent',
  },
  {
    label: 'Document',
    eyebrow: 'Structured long-form',
    icon: FileText,
    accent: 'from-emerald-400/20 to-transparent',
  },
  {
    label: 'Infographic',
    eyebrow: 'Visual explainer',
    icon: ImageIcon,
    accent: 'from-orange-300/18 to-transparent',
  },
  {
    label: 'Slides',
    eyebrow: 'Deck story spine',
    icon: LayoutTemplate,
    accent: 'from-cyan-300/18 to-transparent',
  },
];

export function HeroFormatFlow() {
  return (
    <div className="relative mx-auto w-full max-w-none">
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-[42px]">
        <div className="absolute -left-8 top-12 h-56 w-56 rounded-full bg-primary/12 blur-3xl dark:bg-primary/20 xl:h-64 xl:w-64" />
        <div className="absolute right-2 top-4 h-64 w-64 rounded-full bg-chart-2/12 blur-3xl dark:bg-chart-2/20 xl:h-72 xl:w-72" />
        <div className="absolute bottom-10 left-[36%] h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/16 xl:h-56 xl:w-56" />
        <div className="absolute inset-x-6 top-5 bottom-5 rounded-[36px] border border-[#0B4F58]/14 bg-gradient-to-br from-white/88 via-white/72 to-teal-50/40 backdrop-blur-[2px] dark:border-white/25 dark:bg-gradient-to-br dark:from-white/26 dark:via-white/10 dark:to-transparent xl:inset-x-8 xl:top-6 xl:bottom-6 xl:rounded-[40px]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(8,47,73,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(8,47,73,0.09)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <div className="relative overflow-hidden rounded-[38px] border border-[#0B4F58]/14 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(246,252,251,0.9))] p-5 shadow-[0_36px_120px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-white/28 dark:bg-[linear-gradient(145deg,rgba(5,26,33,0.7),rgba(7,52,60,0.58))] dark:shadow-[0_36px_120px_rgba(15,23,42,0.12)] md:p-6 xl:rounded-[42px] xl:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.1),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.1),transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.14),transparent_38%)]" />

        <div className="relative grid gap-6 lg:min-h-[480px] lg:grid-cols-[minmax(240px,0.96fr)_160px_minmax(260px,1.04fr)] lg:items-center xl:min-h-[560px] xl:grid-cols-[minmax(300px,1.02fr)_220px_minmax(360px,1.12fr)] xl:gap-10">
          <div className="space-y-5 xl:space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0B4F58]/12 bg-white/86 px-3 py-1.5 text-[9px] uppercase tracking-[0.24em] text-[#0B4F58]/62 shadow-sm backdrop-blur-sm dark:border-white/14 dark:bg-white/6 dark:text-cyan-50/62 xl:text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Signal in
            </div>

            <div className="rounded-[28px] border border-orange-200/80 bg-white/94 p-5 shadow-[0_24px_56px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/12 dark:bg-white/8 dark:shadow-[0_24px_56px_rgba(15,23,42,0.08)] xl:rounded-[32px] xl:p-7">
              <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#0B4F58]/54 dark:text-cyan-50/54 xl:text-[11px]">
                Input brief
              </div>
              <div className="mt-4 max-w-[17rem] text-[1.1rem] font-medium leading-8 text-foreground xl:mt-5 xl:max-w-[20rem] xl:text-[1.35rem] xl:leading-9 dark:text-cyan-50">
                Design a sharp World Heart Day campaign with presentation, infographic, and audio output.
              </div>
            </div>

            <div className="space-y-4 xl:space-y-5">
              <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-primary via-chart-3 to-transparent xl:h-[3px]" />
              <div className="flex flex-wrap gap-2">
                {['tone', 'market', 'audience', 'format'].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#0B4F58]/10 bg-white/86 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-[#0B4F58]/62 dark:border-white/12 dark:bg-white/6 dark:text-cyan-50/60 xl:px-3.5 xl:py-2 xl:text-[10px] xl:tracking-[0.22em]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mx-auto flex h-[190px] w-[150px] items-center justify-center xl:h-[250px] xl:w-[210px]">
            <div className="absolute inset-0 rounded-[36px] border border-primary/14 bg-gradient-to-b from-white/30 via-white/18 to-transparent blur-[1px] dark:border-primary/20 dark:from-white/22 dark:via-white/10 xl:rounded-[44px]" />
            <div className="absolute left-1/2 top-1/2 h-[8.5rem] w-[8.5rem] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[28px] border border-primary/24 bg-white/44 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-primary/32 dark:bg-white/14 dark:shadow-[0_18px_60px_rgba(15,23,42,0.14)] xl:h-44 xl:w-44 xl:rounded-[36px]" />
            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[18px] border border-chart-2/24 bg-gradient-to-br from-primary/10 via-transparent to-chart-2/12 dark:border-chart-2/28 dark:from-primary/14 dark:to-chart-2/14 xl:h-32 xl:w-32 xl:rounded-[24px]" />
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0B4F58]/14 bg-white/90 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#0B4F58] shadow-sm backdrop-blur-sm dark:border-white/40 dark:bg-white/12 dark:text-white xl:px-6 xl:py-2.5 xl:text-[11px] xl:tracking-[0.24em]">
              Vera
            </div>
            <div className="absolute left-[4%] top-1/2 h-[2px] w-[18%] -translate-y-1/2 bg-gradient-to-r from-primary to-transparent lg:left-[-24%] lg:w-[40%] xl:left-[-20%] xl:w-[42%]" />
            <div className="absolute right-[4%] top-1/2 h-[2px] w-[18%] -translate-y-1/2 bg-gradient-to-r from-chart-2 via-primary to-transparent lg:right-[-24%] lg:w-[40%] xl:right-[-20%] xl:w-[42%]" />
          </div>

          <div className="relative min-h-[320px] lg:min-h-[380px] xl:min-h-[500px]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0B4F58]/12 bg-white/86 px-3 py-1.5 text-[9px] uppercase tracking-[0.22em] text-[#0B4F58]/62 shadow-sm backdrop-blur-sm dark:border-white/14 dark:bg-white/6 dark:text-cyan-50/62 xl:mb-6 xl:text-[10px] xl:tracking-[0.24em]">
              <span className="h-1.5 w-1.5 rounded-full bg-chart-2" />
              Multi-format out
            </div>

            <div className="relative space-y-3.5 xl:space-y-5">
              {OUTPUTS.map(({ label, eyebrow, icon: Icon, accent }, index) => (
                <div
                  key={label}
                  className={`relative ${
                    index % 2 === 0 ? 'lg:ml-0' : 'lg:ml-6 xl:ml-12'
                  }`}
                >
                  <div
                    className={`absolute left-0 top-1/2 hidden h-[2px] -translate-y-1/2 bg-gradient-to-r ${accent} lg:block`}
                    style={{ width: index % 2 === 0 ? '44px' : '66px', left: index % 2 === 0 ? '-48px' : '-70px' }}
                  />
                  <div className="flex items-center gap-3 rounded-[22px] border border-teal-100 bg-white/94 px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/14 dark:bg-white/8 dark:shadow-[0_18px_44px_rgba(15,23,42,0.08)] xl:gap-4 xl:rounded-[28px] xl:px-6 xl:py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/16 to-chart-2/16 text-primary xl:h-[3.25rem] xl:w-[3.25rem] xl:rounded-2xl">
                      <Icon className="h-4 w-4 xl:h-5 xl:w-5" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.18em] text-[#0B4F58]/54 dark:text-cyan-50/54 xl:text-[10px] xl:tracking-[0.22em]">
                        {eyebrow}
                      </div>
                      <div className="mt-1 text-[15px] font-semibold text-foreground xl:text-lg dark:text-white">
                        {label}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
