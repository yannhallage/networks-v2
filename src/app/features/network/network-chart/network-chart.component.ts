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
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
  type Plugin,
} from 'chart.js';
import { DEFAULT_PAGE_TIMINGS } from '../../../data/default-network.data';
import type { NetworkRowView } from '../models/network-row.model';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const BAR_COLORS: Record<NetworkRowView['barClass'], string> = {
  fetch: '#1a73e8',
  xhr: '#188038',
  script: '#5f6368',
  stylesheet: '#9334e6',
  failed: '#9aa0a6',
};

function milestoneLinesPlugin(
  maxMs: number,
  domMs: number,
  loadMs: number,
): Plugin {
  return {
    id: 'milestoneLines',
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales['x'];
      if (!xScale || !('getPixelForValue' in xScale)) return;
      const scale = xScale as { getPixelForValue: (v: number) => number };
      const { top, bottom } = chartArea;
      const milestones = [
        { ms: domMs, color: 'rgba(26, 115, 232, 0.9)' },
        { ms: loadMs, color: 'rgba(217, 48, 37, 0.95)' },
      ];
      ctx.save();
      for (const { ms, color } of milestones) {
        if (ms < 0 || ms > maxMs) continue;
        const x = scale.getPixelForValue(ms);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
      }
      ctx.restore();
    },
  };
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
  @Input({ required: true }) maxMs = 12000;
  @Input() domContentLoadedMs = DEFAULT_PAGE_TIMINGS.domContentLoadedMs;
  @Input() loadEventMs = DEFAULT_PAGE_TIMINGS.loadEventMs;

  private chart?: Chart;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    const host = this.canvasRef?.nativeElement?.parentElement;
    if (host && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
      this.resizeObserver.observe(host);
    }
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.canvasRef?.nativeElement) return;
    if (
      changes['rows'] ||
      changes['maxMs'] ||
      changes['domContentLoadedMs'] ||
      changes['loadEventMs']
    ) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
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

    const labels = this.rows.map((r) => this.shortLabel(r.name));
    const floating: [number, number][] = this.rows.map((r) => [
      r.startMs,
      r.startMs + r.durationMs,
    ]);
    const backgroundColor = this.rows.map((r) => BAR_COLORS[r.barClass]);
    const borderColor = this.rows.map((r) =>
      r.barClass === 'failed' ? '#d93025' : 'rgba(0,0,0,0.06)',
    );
    const borderWidth = this.rows.map((r) => (r.barClass === 'failed' ? 1 : 0));

    const max = Math.max(this.maxMs, 1000);
    const milestonePlugin = milestoneLinesPlugin(max, this.domContentLoadedMs, this.loadEventMs);
    const rowsSnapshot = [...this.rows];

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Waterfall',
            data: floating as unknown as number[],
            backgroundColor,
            borderColor,
            borderWidth,
            borderSkipped: false,
            barThickness: 14,
            maxBarThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 240 },
        layout: { padding: { left: 4, right: 10, top: 6, bottom: 6 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const i = items[0]?.dataIndex ?? 0;
                return rowsSnapshot[i]?.name ?? '';
              },
              label: (item) => {
                const i = item.dataIndex ?? 0;
                const row = rowsSnapshot[i];
                if (!row) return '';
                return [
                  `Durée : ${row.durationMs} ms`,
                  `Fenêtre : ${row.startMs} → ${row.startMs + row.durationMs} ms`,
                  `Type : ${row.type}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max,
            grid: { color: 'rgba(0,0,0,0.07)' },
            ticks: {
              stepSize: max <= 20000 ? 1000 : 5000,
              callback: (raw) => `${raw} ms`,
              font: { size: 10 },
            },
            border: { display: false },
          },
          y: {
            reverse: true,
            grid: { display: false },
            ticks: {
              font: { size: 10 },
              color: '#5f6368',
              autoSkip: false,
            },
            border: { display: false },
          },
        },
      },
      plugins: [milestonePlugin],
    };

    this.chart = new Chart(canvas, config);
  }

  private shortLabel(name: string): string {
    return name.length > 40 ? `${name.slice(0, 20)}…${name.slice(-12)}` : name;
  }

  /** Hauteur du canvas (barres + marges) — le parent peut plafonner en CSS */
  chartHeightPx(): number {
    return Math.max(120, this.rows.length * 28 + 52);
  }
}
