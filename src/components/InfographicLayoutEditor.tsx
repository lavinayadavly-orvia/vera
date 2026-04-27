import { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Move, Save, RotateCcw } from 'lucide-react';

interface InfographicLayoutEditorProps {
  html: string;
  frameHeightClass: string;
  onSave: (html: string) => void;
}

function injectEditorRuntime(html: string): string {
  const runtime = `
<style id="vera-layout-editor-style">
  [data-vera-editable-block] {
    cursor: grab !important;
    transition: box-shadow .15s ease, outline-color .15s ease, transform .05s linear !important;
    outline: 1.5px dashed rgba(240, 106, 47, .55) !important;
    outline-offset: 4px !important;
  }
  [data-vera-editable-block]:hover {
    box-shadow: 0 0 0 5px rgba(240, 106, 47, .12), 0 24px 60px rgba(0,0,0,.22) !important;
  }
  [data-vera-editable-block][data-dragging="true"] {
    cursor: grabbing !important;
    outline-color: rgba(50, 194, 175, .9) !important;
    z-index: 50 !important;
  }
  [data-vera-editable-block]::before {
    content: "MOVE";
    position: absolute;
    top: -12px;
    right: 10px;
    z-index: 60;
    padding: 4px 8px;
    border-radius: 999px;
    background: #f06a2f;
    color: #fff7ec;
    font: 700 9px/1 Space Grotesk, ui-sans-serif, system-ui, sans-serif;
    letter-spacing: .14em;
    box-shadow: 0 8px 20px rgba(0,0,0,.2);
    pointer-events: none;
  }
  [contenteditable="true"] {
    cursor: text !important;
    outline: 1px dotted rgba(50, 194, 175, .35);
    outline-offset: 2px;
  }
  [contenteditable="true"]:focus {
    outline: 2px solid rgba(50, 194, 175, .75) !important;
    background: rgba(50, 194, 175, .08);
  }
  #vera-editor-hint {
    position: fixed;
    left: 18px;
    bottom: 18px;
    z-index: 99999;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(12, 18, 22, .84);
    color: #f6f3ec;
    font: 600 11px/1.2 Space Grotesk, ui-sans-serif, system-ui, sans-serif;
    letter-spacing: .06em;
    text-transform: uppercase;
    border: 1px solid rgba(255,255,255,.12);
    backdrop-filter: blur(14px);
  }
</style>
<script id="vera-layout-editor-script">
(() => {
  const selectors = [
    '.hero-copy',
    '.signal-panel',
    '.highlight-band',
    '.insight-card',
    '.action-card',
    '.references'
  ];
  const blocks = Array.from(document.querySelectorAll(selectors.join(',')));
  const hint = document.createElement('div');
  hint.id = 'vera-editor-hint';
  hint.textContent = 'Drag blocks to tune layout';
  document.body.appendChild(hint);

  blocks.forEach((block, index) => {
    block.setAttribute('data-vera-editable-block', String(index + 1));
    block.style.position = block.style.position || 'relative';
    block.style.touchAction = 'none';
    block.style.userSelect = 'none';
    const currentTransform = block.style.transform || '';
    if (!currentTransform.includes('translate')) {
      block.dataset.x = '0';
      block.dataset.y = '0';
    }
  });

  document.querySelectorAll('h1, h2, h3, p, li, .signal-value, .signal-label, .action-card p, .highlight-copy').forEach((element) => {
    element.setAttribute('contenteditable', 'true');
    element.setAttribute('spellcheck', 'true');
  });

  let active = null;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  function getTranslate(block) {
    return {
      x: Number.parseFloat(block.dataset.x || '0') || 0,
      y: Number.parseFloat(block.dataset.y || '0') || 0,
    };
  }

  window.__veraResetLayout = () => {
    blocks.forEach((block) => {
      block.dataset.x = '0';
      block.dataset.y = '0';
      block.style.transform = '';
    });
  };

  window.addEventListener('pointerdown', (event) => {
    if (event.target.closest('[contenteditable="true"]')) return;
    const target = event.target.closest('[data-vera-editable-block]');
    if (!target) return;
    active = target;
    const current = getTranslate(active);
    startX = event.clientX;
    startY = event.clientY;
    originX = current.x;
    originY = current.y;
    active.setAttribute('data-dragging', 'true');
    active.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  window.addEventListener('pointermove', (event) => {
    if (!active) return;
    const nextX = originX + event.clientX - startX;
    const nextY = originY + event.clientY - startY;
    active.dataset.x = String(Math.round(nextX));
    active.dataset.y = String(Math.round(nextY));
    active.style.transform = 'translate(' + Math.round(nextX) + 'px, ' + Math.round(nextY) + 'px)';
  });

  window.addEventListener('pointerup', (event) => {
    if (!active) return;
    active.releasePointerCapture?.(event.pointerId);
    active.removeAttribute('data-dragging');
    active = null;
  });
})();
</script>`;

  return html.replace('</body>', `${runtime}</body>`);
}

function cleanEditorHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelector('#vera-layout-editor-style')?.remove();
  doc.querySelector('#vera-layout-editor-script')?.remove();
  doc.querySelector('#vera-editor-hint')?.remove();
  doc.querySelectorAll('[data-vera-editable-block]').forEach((element) => {
    element.removeAttribute('data-vera-editable-block');
    element.removeAttribute('data-dragging');
    element.removeAttribute('data-x');
    element.removeAttribute('data-y');
    (element as HTMLElement).style.touchAction = '';
    (element as HTMLElement).style.userSelect = '';
  });
  doc.querySelectorAll('[contenteditable="true"]').forEach((element) => {
    element.removeAttribute('contenteditable');
    element.removeAttribute('spellcheck');
  });

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export function InfographicLayoutEditor({ html, frameHeightClass, onSave }: InfographicLayoutEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const editableHtml = useMemo(() => injectEditorRuntime(html), [html]);

  const saveLayout = () => {
    const documentHtml = iframeRef.current?.contentDocument?.documentElement?.outerHTML;
    if (!documentHtml) return;
    onSave(cleanEditorHtml(documentHtml));
  };

  const resetLayout = () => {
    iframeRef.current?.contentWindow?.__veraResetLayout?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#0b6b6f]/12 bg-[#f6fbfb] p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[#0b6b6f]">
          <Move className="h-4 w-4" />
          Drag cards directly on the canvas. Save when the layout feels right.
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={resetLayout} className="rounded-full">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button type="button" size="sm" onClick={saveLayout} className="rounded-full">
            <Save className="mr-2 h-4 w-4" />
            Save Layout
          </Button>
        </div>
      </div>
      <div className="w-full overflow-hidden rounded-[26px] border border-[#0b6b6f]/12 bg-white shadow-inner">
        <iframe
          ref={iframeRef}
          srcDoc={editableHtml}
          className={`w-full ${frameHeightClass} border-none`}
          title="Editable Infographic Canvas"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}

declare global {
  interface Window {
    __veraResetLayout?: () => void;
  }
}
