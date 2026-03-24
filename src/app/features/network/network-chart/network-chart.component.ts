import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
  type Plugin,
} from 'chart.js';
import type { NetworkRowView } from '../models/network-row.model';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

const LINE_COLOR = '#0d9488';
const LINE_FILL = 'rgba(13, 148, 136, 0.12)';
const BUCKET_COUNT = 48;
type ResolvedTheme = 'light' | 'dark';

function formatAxisTime(ms: number, spanMs: number): string {
  const d = new Date(ms);
  if (spanMs > 86_400_000) {
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    ...(spanMs < 120_000 ? { second: '2-digit' as const } : {}),
    hour12: false,
  });
}

function formatInterval(startMs: number, endMs: number, spanMs: number): string {
  const a = formatAxisTime(startMs, spanMs);
  const b = formatAxisTime(endMs, spanMs);
  return `${a} — ${b}`;
}

function diagonalHatchPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const s = 7;
  const p = document.createElement('canvas');
  p.width = s;
  p.height = s;
  const pc = p.getContext('2d');
  if (!pc) return null;
  pc.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  pc.lineWidth = 1;
  pc.beginPath();
  pc.moveTo(0, s);
  pc.lineTo(s, 0);
  pc.stroke();
  return ctx.createPattern(p, 'repeat');
}

function hatchBackgroundPlugin(theme: ResolvedTheme): Plugin {
  return {
    id: 'hatchBackground',
    beforeDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const pattern = diagonalHatchPattern(ctx);
      ctx.save();
      ctx.fillStyle = theme === 'dark' ? '#0c1424' : '#f6f7f8';
      ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
      }
      ctx.restore();
    },
  };
}

function buildTimeHistogram(timestamps: number[]): {
  domainMin: number;
  domainMax: number;
  points: { x: number; y: number }[];
  bucketMeta: { startMs: number; endMs: number; count: number }[];
} {
  const rawMin = Math.min(...timestamps);
  const rawMax = Math.max(...timestamps);
  const rawSpan = Math.max(rawMax - rawMin, 0);

  let domainMin = rawMin;
  let domainMax = rawMax;
  if (rawSpan < 120_000) {
    const mid = (rawMin + rawMax) / 2;
    const half = Math.max(60_000, rawSpan / 2 + 15_000);
    domainMin = mid - half;
    domainMax = mid + half;
  } else {
    const pad = rawSpan * 0.02;
    domainMin = rawMin - pad;
    domainMax = rawMax + pad;
  }

  const span = Math.max(domainMax - domainMin, 1000);
  const bucketMs = span / BUCKET_COUNT;
  const counts = new Array<number>(BUCKET_COUNT).fill(0);

  for (const ts of timestamps) {
    if (ts < domainMin || ts > domainMax) continue;
    let i = Math.floor((ts - domainMin) / bucketMs);
    if (i >= BUCKET_COUNT) i = BUCKET_COUNT - 1;
    if (i < 0) i = 0;
    counts[i]++;
  }

  const bucketMeta = counts.map((count, i) => ({
    startMs: domainMin + i * bucketMs,
    endMs: domainMin + (i + 1) * bucketMs,
    count,
  }));

  const points = counts.map((y, i) => ({
    x: domainMin + (i + 0.5) * bucketMs,
    y,
  }));

  return { domainMin, domainMax, points, bucketMeta };
}

@Component({
  selector: 'app-network-chart',
  standalone: true,
  templateUrl: './network-chart.component.html',
  host: {
    class: 'block min-h-0 w-full min-w-0 flex-1',
  },
})
export class NetworkChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) rows: NetworkRowView[] = [];

  private chart?: Chart;
  private resizeObserver?: ResizeObserver;
  private themeObserver?: MutationObserver;

  ngAfterViewInit(): void {
    const host = this.canvasRef?.nativeElement?.parentElement;
    if (host && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
      this.resizeObserver.observe(host);
    }
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this.themeObserver = new MutationObserver(() => this.renderChart());
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.canvasRef?.nativeElement) return;
    if (changes['rows']) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();
    this.chart?.destroy();
    this.chart = undefined;
  }

  private renderChart(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.chart?.destroy();

    if (this.rows.length === 0) {
      this.chart = undefined;
      return;
    }

    const timestamps = this.rows.map((r) => r.capturedAtMs);
    const { domainMin, domainMax, points, bucketMeta } = buildTimeHistogram(timestamps);
    const spanMs = domainMax - domainMin;
    const maxCount = Math.max(1, ...bucketMeta.map((b) => b.count));

    const theme = this.currentTheme();
    const hatchPlugin = hatchBackgroundPlugin(theme);
    const gridColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.22)' : 'rgba(0, 0, 0, 0.08)';
    const tickColor = theme === 'dark' ? '#93a4bd' : '#5f6368';
    const yTitleColor = theme === 'dark' ? '#b8c8e5' : '#70757a';
    const pointHoverBorder = theme === 'dark' ? '#0b1220' : '#ffffff';

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Requêtes',
            data: points,
            parsing: { xAxisKey: 'x', yAxisKey: 'y' },
            borderColor: LINE_COLOR,
            backgroundColor: LINE_FILL,
            borderWidth: 1.5,
            fill: true,
            tension: 0.25,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: LINE_COLOR,
            pointHoverBorderColor: pointHoverBorder,
            pointHoverBorderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 280 },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { left: 4, right: 8, top: 6, bottom: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const i = items[0]?.dataIndex ?? 0;
                const b = bucketMeta[i];
                if (!b) return '';
                return formatInterval(b.startMs, b.endMs, spanMs);
              },
              label: (item) => {
                const i = item.dataIndex ?? 0;
                const n = bucketMeta[i]?.count ?? Number(item.parsed.y);
                return n === 1
                  ? '1 requête dans cette fenêtre'
                  : `${n} requêtes dans cette fenêtre`;
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: domainMin,
            max: domainMax,
            grid: { color: gridColor },
            ticks: {
              maxTicksLimit: 6,
              font: { size: 10, family: 'system-ui, sans-serif' },
              color: tickColor,
              callback: (raw) => formatAxisTime(Number(raw), spanMs),
            },
            border: { display: false },
          },
          y: {
            type: 'linear',
            beginAtZero: true,
            suggestedMax: maxCount < 4 ? 4 : undefined,
            grid: { color: gridColor },
            ticks: {
              precision: 0,
              maxTicksLimit: 6,
              font: { size: 10, family: 'system-ui, sans-serif' },
              color: tickColor,
            },
            border: { display: false },
            title: {
              display: true,
              text: 'Requêtes / fenêtre',
              color: yTitleColor,
              font: { size: 10, weight: 'bold' },
            },
          },
        },
      },
      plugins: [hatchPlugin],
    };

    this.chart = new Chart(canvas, config);
  }

  /** Hauteur fixe type tableau de bord (zone au-dessus du tableau) */
  chartHeightPx(): number {
    return 200;
  }

  private currentTheme(): ResolvedTheme {
    if (typeof document === 'undefined') {
      return 'light';
    }
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
}
