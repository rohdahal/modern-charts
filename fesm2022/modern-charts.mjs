import * as i0 from '@angular/core';
import { Injectable, inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, Input, ChangeDetectionStrategy, Component, ENVIRONMENT_INITIALIZER, Injector } from '@angular/core';
import * as i1 from '@angular/common';
import { isPlatformBrowser, CommonModule } from '@angular/common';

const defaultPalette = [
    '#2563eb',
    '#7c3aed',
    '#ea580c',
    '#16a34a',
    '#dc2626',
    '#0891b2',
];
const DEFAULT_CHART_THEME = {
    background: '#ffffff',
    palette: defaultPalette,
    axis: {
        color: '#6b7280',
        labelColor: '#111827',
        gridColor: 'rgba(107, 114, 128, 0.2)',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
    },
    legend: {
        color: '#111827',
        fontSize: 13,
        fontFamily: 'Inter, system-ui, sans-serif',
    },
    series: {
        strokeWidth: 2,
        pointRadius: 3,
        areaOpacity: 0.25,
    },
};
function mergeTheme(overrides) {
    if (!overrides) {
        return DEFAULT_CHART_THEME;
    }
    const axis = {
        ...DEFAULT_CHART_THEME.axis,
        ...overrides.axis,
    };
    const legend = {
        ...DEFAULT_CHART_THEME.legend,
        ...overrides.legend,
    };
    const series = {
        ...DEFAULT_CHART_THEME.series,
        ...overrides.series,
    };
    const background = overrides.background ?? DEFAULT_CHART_THEME.background;
    const palette = overrides.palette ?? DEFAULT_CHART_THEME.palette;
    return {
        background,
        palette,
        axis,
        legend,
        series,
    };
}

function createLinearScale({ domain, range, clamp = false }) {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    const domainSpan = d1 - d0 || 1;
    const rangeSpan = r1 - r0;
    return (value) => {
        const t = (value - d0) / domainSpan;
        const unclamped = r0 + t * rangeSpan;
        if (!clamp) {
            return unclamped;
        }
        if (rangeSpan >= 0) {
            return Math.min(Math.max(unclamped, Math.min(r0, r1)), Math.max(r0, r1));
        }
        return Math.max(Math.min(unclamped, Math.max(r0, r1)), Math.min(r0, r1));
    };
}

const PADDING_DEFAULT = 32;
class ChartEngine {
    registry;
    theme;
    constructor(registry) {
        this.registry = registry;
        this.theme = mergeTheme(undefined);
    }
    setTheme(theme) {
        this.theme = mergeTheme(theme);
    }
    render(canvas, config) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context is not available.');
        }
        this.setTheme(config.theme);
        const layout = this.resolveLayout(canvas, config);
        this.prepareCanvas(canvas, ctx, layout);
        const normalizedSeries = config.data.series
            .map((series) => this.normalizeSeries(series))
            .filter((serie) => !!serie);
        if (!normalizedSeries.length) {
            return;
        }
        const xDomain = this.combineDomain(normalizedSeries.map((serie) => serie.xDomain));
        const yDomain = this.combineDomain(normalizedSeries.map((serie) => serie.yDomain));
        const xScale = createLinearScale({ domain: xDomain, range: [layout.padding.left, layout.width - layout.padding.right] });
        const yScale = createLinearScale({ domain: yDomain, range: [layout.height - layout.padding.bottom, layout.padding.top] });
        ctx.fillStyle = this.theme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.drawGrid(ctx, layout, xDomain, yDomain);
        const pointMeta = new Array();
        normalizedSeries.forEach((serie, index) => {
            const renderer = this.registry.getSeriesRenderer(serie.config.type);
            if (!renderer) {
                console.warn(`No renderer registered for series type "${serie.config.type}".`);
                return;
            }
            const renderContext = {
                ctx,
                config,
                theme: this.theme,
                layout,
                series: {
                    color: this.theme.palette[index % this.theme.palette.length],
                    ...serie.config,
                },
                points: serie.points,
                seriesIndex: index,
                xScale: (value) => xScale(value),
                yScale: (value) => yScale(value),
            };
            renderer.render(renderContext);
            serie.points.forEach((point, pointIndex) => {
                pointMeta.push({
                    seriesIndex: index,
                    pointIndex,
                    value: point,
                    canvasX: xScale(point.x),
                    canvasY: yScale(point.y),
                    series: renderContext.series,
                });
            });
        });
        this.drawAxes(ctx, layout, xDomain, yDomain, config);
        return {
            layout,
            theme: this.theme,
            config,
            points: pointMeta,
        };
    }
    prepareCanvas(canvas, ctx, layout) {
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        canvas.width = layout.width * dpr;
        canvas.height = layout.height * dpr;
        canvas.style.width = `${layout.width}px`;
        canvas.style.height = `${layout.height}px`;
        ctx.scale(dpr, dpr);
    }
    resolveLayout(canvas, config) {
        const rect = canvas.getBoundingClientRect();
        const layoutConfig = config.layout ?? {};
        const width = Math.floor(layoutConfig.autoFit ? rect.width : rect.width || canvas.width || 640);
        const height = Math.floor(layoutConfig.autoFit ? rect.height : rect.height || canvas.height || 360);
        const paddingValue = layoutConfig.padding ?? PADDING_DEFAULT;
        const padding = typeof paddingValue === 'number'
            ? { top: paddingValue, right: paddingValue, bottom: paddingValue, left: paddingValue }
            : {
                top: paddingValue.top ?? PADDING_DEFAULT,
                right: paddingValue.right ?? PADDING_DEFAULT,
                bottom: paddingValue.bottom ?? PADDING_DEFAULT,
                left: paddingValue.left ?? PADDING_DEFAULT,
            };
        return { width, height, padding };
    }
    normalizeSeries(series) {
        const points = series.data.map((value, index) => {
            if (Array.isArray(value)) {
                return { x: value[0], y: value[1] };
            }
            if (typeof value === 'number') {
                return { x: index, y: value };
            }
            return value;
        }).filter((point) => point != null && !Number.isNaN(point.x) && !Number.isNaN(point.y));
        if (!points.length) {
            return undefined;
        }
        const xValues = points.map((point) => point.x);
        const yValues = points.map((point) => point.y);
        const xDomain = [Math.min(...xValues), Math.max(...xValues)];
        const yDomain = [Math.min(...yValues), Math.max(...yValues)];
        if (yDomain[0] === yDomain[1]) {
            const padding = Math.abs(yDomain[0]) * 0.05 || 1;
            yDomain[0] -= padding;
            yDomain[1] += padding;
        }
        if (xDomain[0] === xDomain[1]) {
            xDomain[0] -= 1;
            xDomain[1] += 1;
        }
        return { config: series, points, xDomain, yDomain };
    }
    combineDomain(domains) {
        const min = Math.min(...domains.map(([start]) => start));
        const max = Math.max(...domains.map(([, end]) => end));
        return [min, max];
    }
    drawAxes(ctx, layout, xDomain, yDomain, config) {
        const { padding } = layout;
        const theme = this.theme;
        ctx.save();
        ctx.strokeStyle = theme.axis.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, layout.height - padding.bottom);
        ctx.lineTo(layout.width - padding.right, layout.height - padding.bottom);
        ctx.moveTo(padding.left, layout.height - padding.bottom);
        ctx.lineTo(padding.left, padding.top);
        ctx.stroke();
        const xTickCount = config.axes?.find((axis) => axis.position === 'bottom')?.tickCount ?? 5;
        const yTickCount = config.axes?.find((axis) => axis.position === 'left')?.tickCount ?? 5;
        const xScale = createLinearScale({ domain: xDomain, range: [padding.left, layout.width - padding.right] });
        const yScale = createLinearScale({ domain: yDomain, range: [layout.height - padding.bottom, padding.top] });
        ctx.fillStyle = theme.axis.labelColor;
        ctx.font = `${theme.axis.fontSize}px ${theme.axis.fontFamily}`;
        ctx.textAlign = 'center';
        for (let i = 0; i <= xTickCount; i += 1) {
            const t = i / xTickCount;
            const value = xDomain[0] + t * (xDomain[1] - xDomain[0]);
            const x = xScale(value);
            ctx.beginPath();
            ctx.moveTo(x, layout.height - padding.bottom);
            ctx.lineTo(x, layout.height - padding.bottom + 4);
            ctx.stroke();
            ctx.fillText(this.formatAxisValue(value, 'x', config), x, layout.height - padding.bottom + 16);
        }
        ctx.textAlign = 'right';
        for (let i = 0; i <= yTickCount; i += 1) {
            const t = i / yTickCount;
            const value = yDomain[0] + t * (yDomain[1] - yDomain[0]);
            const y = yScale(value);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left - 4, y);
            ctx.stroke();
            ctx.fillText(this.formatAxisValue(value, 'y', config), padding.left - 8, y + 3);
        }
        ctx.restore();
    }
    drawGrid(ctx, layout, xDomain, yDomain) {
        const { padding } = layout;
        const theme = this.theme;
        ctx.save();
        ctx.strokeStyle = theme.axis.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        const gridLines = 5;
        const xScale = createLinearScale({ domain: xDomain, range: [padding.left, layout.width - padding.right] });
        const yScale = createLinearScale({ domain: yDomain, range: [layout.height - padding.bottom, padding.top] });
        for (let i = 1; i < gridLines; i += 1) {
            const t = i / gridLines;
            const x = padding.left + t * (layout.width - padding.left - padding.right);
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, layout.height - padding.bottom);
            ctx.stroke();
        }
        for (let i = 1; i < gridLines; i += 1) {
            const value = yDomain[0] + (i / gridLines) * (yDomain[1] - yDomain[0]);
            const y = yScale(value);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(layout.width - padding.right, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
    }
    formatAxisValue(value, axis, config) {
        const axisConfig = config.axes?.find((candidate) => axis === 'x' ? candidate.position === 'bottom' : candidate.position === 'left');
        if (axisConfig?.formatter) {
            return axisConfig.formatter(value);
        }
        const digits = Math.abs(value) >= 1000 ? 0 : 2;
        return value.toFixed(digits);
    }
}

class ChartRegistry {
    seriesRenderers = new Map();
    registerSeriesRenderer(renderer) {
        this.seriesRenderers.set(renderer.type, renderer);
    }
    getSeriesRenderer(type) {
        return this.seriesRenderers.get(type);
    }
    getRegisteredTypes() {
        return Array.from(this.seriesRenderers.keys());
    }
}

class LineSeriesRenderer {
    type = 'line';
    render({ ctx, series, points, xScale, yScale, theme }) {
        if (!points.length) {
            return;
        }
        const strokeWidth = series.strokeWidth ?? theme.series.strokeWidth;
        const color = series.color ?? theme.palette[0];
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            if (index === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        const pointRadius = theme.series.pointRadius;
        if (pointRadius > 0) {
            ctx.fillStyle = color;
            points.forEach((point) => {
                const x = xScale(point.x);
                const y = yScale(point.y);
                ctx.beginPath();
                ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        ctx.restore();
    }
}

class AreaSeriesRenderer {
    type = 'area';
    render({ ctx, series, points, xScale, yScale, theme, layout }) {
        if (!points.length) {
            return;
        }
        const color = series.color ?? theme.palette[0];
        const opacity = series.fillOpacity ?? theme.series.areaOpacity;
        ctx.save();
        ctx.fillStyle = this.applyAlpha(color, opacity);
        ctx.strokeStyle = color;
        ctx.lineWidth = series.strokeWidth ?? theme.series.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            if (index === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        });
        const lastPointIndex = points.length - 1;
        const firstX = xScale(points[0].x);
        const baselineY = layout.height - layout.padding.bottom;
        ctx.lineTo(xScale(points[lastPointIndex].x), baselineY);
        ctx.lineTo(firstX, baselineY);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        points.forEach((point, index) => {
            const x = xScale(point.x);
            const y = yScale(point.y);
            if (index === 0) {
                ctx.moveTo(x, y);
            }
            else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.restore();
    }
    applyAlpha(hex, alpha) {
        if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
            const normalized = hex.length === 4
                ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
                : hex;
            const [, r, g, b] = normalized.match(/#(..)(..)(..)/);
            const rDec = parseInt(r, 16);
            const gDec = parseInt(g, 16);
            const bDec = parseInt(b, 16);
            return `rgba(${rDec}, ${gDec}, ${bDec}, ${Math.min(Math.max(alpha, 0), 1)})`;
        }
        return hex;
    }
}

class ChartEngineFactory {
    registry = new ChartRegistry();
    defaultsRegistered = false;
    registerSeriesRenderer(renderer) {
        this.registry.registerSeriesRenderer(renderer);
    }
    create() {
        this.ensureDefaultRenderers();
        return new ChartEngine(this.registry);
    }
    ensureDefaultRenderers() {
        if (this.defaultsRegistered) {
            return;
        }
        this.registerSeriesRenderer(new LineSeriesRenderer());
        this.registerSeriesRenderer(new AreaSeriesRenderer());
        this.defaultsRegistered = true;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.2", ngImport: i0, type: ChartEngineFactory, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.2", ngImport: i0, type: ChartEngineFactory, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.2", ngImport: i0, type: ChartEngineFactory, decorators: [{
            type: Injectable,
            args: [{ providedIn: 'root' }]
        }] });

class ChartComponent {
    platformId = inject(PLATFORM_ID);
    engineFactory = inject(ChartEngineFactory);
    cdr = inject(ChangeDetectorRef);
    resizeObserver;
    engine;
    renderState;
    config;
    canvasRef;
    wrapperRef;
    ngAfterViewInit() {
        if (!this.isBrowser()) {
            return;
        }
        this.engine = this.engineFactory.create();
        this.render();
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.render());
            this.resizeObserver.observe(this.wrapperRef.nativeElement);
        }
    }
    ngOnChanges(changes) {
        if (changes['config'] && !changes['config'].isFirstChange()) {
            this.render();
        }
    }
    ngOnDestroy() {
        this.resizeObserver?.disconnect();
    }
    render() {
        if (!this.engine || !this.canvasRef || !this.config) {
            return;
        }
        this.renderState = undefined;
        this.clearPointerState(false);
        queueMicrotask(() => {
            if (!this.engine) {
                return;
            }
            const result = this.engine.render(this.canvasRef.nativeElement, this.config);
            this.renderState = result;
            this.cdr.markForCheck();
        });
    }
    isBrowser() {
        return isPlatformBrowser(this.platformId);
    }
    get overlayVisible() {
        return !!(this.tooltipState || this.crosshairState);
    }
    tooltipState;
    crosshairState;
    handlePointer(event) {
        const renderState = this.renderState;
        if (!renderState) {
            return;
        }
        const tooltipEnabled = this.isInteractionEnabled('tooltip');
        const crosshairEnabled = this.isInteractionEnabled('crosshair');
        if (!tooltipEnabled && !crosshairEnabled) {
            return;
        }
        const rect = this.wrapperRef.nativeElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const nearest = this.getNearestPoint(renderState, x, y);
        if (!nearest) {
            this.clearPointerState();
            return;
        }
        if (crosshairEnabled) {
            this.crosshairState = { x: nearest.canvasX, y: nearest.canvasY };
        }
        else {
            this.crosshairState = undefined;
        }
        if (tooltipEnabled) {
            this.tooltipState = this.buildTooltipState(renderState, nearest, rect.width, rect.height);
        }
        else {
            this.tooltipState = undefined;
        }
        this.cdr.markForCheck();
    }
    clearPointerState(mark = true) {
        this.tooltipState = undefined;
        this.crosshairState = undefined;
        if (mark) {
            this.cdr.markForCheck();
        }
    }
    isInteractionEnabled(key) {
        return !!this.config?.interactions?.[key];
    }
    getNearestPoint(state, x, y) {
        const threshold = 32;
        let minDistance = Number.POSITIVE_INFINITY;
        let candidate;
        for (const point of state.points) {
            const dx = point.canvasX - x;
            const dy = point.canvasY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                minDistance = distance;
                candidate = point;
            }
        }
        if (!candidate || minDistance > threshold) {
            return undefined;
        }
        return candidate;
    }
    buildTooltipState(state, point, width, height) {
        const label = this.getLabelForPoint(state, point);
        const value = this.formatValue(point.value.y);
        const palette = state.theme.palette;
        const paletteColor = palette[point.seriesIndex % palette.length] ?? '#2563eb';
        const color = point.series.color ?? paletteColor;
        const left = this.clamp(point.canvasX + 16, 12, width - 12);
        const top = this.clamp(point.canvasY - 16, 12, height - 12);
        return {
            x: point.canvasX,
            y: point.canvasY,
            left,
            top,
            label,
            value,
            seriesName: point.series.name,
            color,
            dotFill: this.applyAlpha(color, 0.15),
        };
    }
    getLabelForPoint(state, point) {
        const labels = state.config.data.labels;
        if (labels && labels[point.pointIndex] != null) {
            return String(labels[point.pointIndex]);
        }
        return this.formatValue(point.value.x);
    }
    formatValue(value) {
        if (Math.abs(value) >= 1000) {
            const suffixes = ['k', 'M', 'B'];
            let base = Math.abs(value);
            let index = -1;
            while (base >= 1000 && index < suffixes.length - 1) {
                base /= 1000;
                index += 1;
            }
            const formatted = `${value < 0 ? '-' : ''}${base.toFixed(base < 10 ? 1 : 0)}${suffixes[index] ?? ''}`;
            return formatted;
        }
        if (Number.isInteger(value)) {
            return value.toString();
        }
        return value.toFixed(2);
    }
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    applyAlpha(color, alpha) {
        if (!color.startsWith('#')) {
            return color;
        }
        const normalized = color.length === 4
            ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
            : color;
        const [, r, g, b] = normalized.match(/#(..)(..)(..)/);
        const rDec = parseInt(r, 16);
        const gDec = parseInt(g, 16);
        const bDec = parseInt(b, 16);
        return `rgba(${rDec}, ${gDec}, ${bDec}, ${alpha})`;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.2", ngImport: i0, type: ChartComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.3.2", type: ChartComponent, isStandalone: true, selector: "mc-chart", inputs: { config: "config" }, viewQueries: [{ propertyName: "canvasRef", first: true, predicate: ["canvas"], descendants: true, static: true }, { propertyName: "wrapperRef", first: true, predicate: ["wrapper"], descendants: true, static: true }], usesOnChanges: true, ngImport: i0, template: `
    <div class="mc-chart" #wrapper>
      <canvas
        #canvas
        (pointermove)="handlePointer($event)"
        (pointerleave)="clearPointerState()"
        (pointercancel)="clearPointerState()"
      ></canvas>
      <div class="mc-chart__overlay" *ngIf="overlayVisible">
        <div
          *ngIf="crosshairState"
          class="mc-chart__crosshair mc-chart__crosshair--x"
          [style.left.px]="crosshairState.x"
        ></div>
        <div
          *ngIf="crosshairState"
          class="mc-chart__crosshair mc-chart__crosshair--y"
          [style.top.px]="crosshairState.y"
        ></div>
        <div
          *ngIf="tooltipState"
          class="mc-chart__dot"
          [style.left.px]="tooltipState.x"
          [style.top.px]="tooltipState.y"
          [style.border-color]="tooltipState.color"
          [style.background]="tooltipState.dotFill"
        ></div>
        <div
          *ngIf="tooltipState"
          class="mc-chart__tooltip"
          [style.left.px]="tooltipState.left"
          [style.top.px]="tooltipState.top"
        >
          <div class="mc-chart__tooltip-series">
            <span class="mc-chart__swatch" [style.background]="tooltipState.color"></span>
            <span>{{ tooltipState.seriesName || 'Series' }}</span>
          </div>
          <div class="mc-chart__tooltip-metric">
            <span class="mc-chart__tooltip-label">{{ tooltipState.label }}</span>
            <span class="mc-chart__tooltip-value">{{ tooltipState.value }}</span>
          </div>
        </div>
      </div>
    </div>
  `, isInline: true, styles: [":host{display:block;width:100%;height:100%;min-height:240px}.mc-chart{position:relative;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;display:block}.mc-chart__overlay{pointer-events:none;position:absolute;inset:0;font-family:inherit}.mc-chart__crosshair{position:absolute;background:#2563eb4d;-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px)}.mc-chart__crosshair--x{top:0;bottom:0;width:1px;transform:translate(-.5px)}.mc-chart__crosshair--y{left:0;right:0;height:1px;transform:translateY(-.5px)}.mc-chart__dot{position:absolute;width:12px;height:12px;border-radius:999px;border:2px solid;transform:translate(-50%,-50%);box-shadow:0 4px 16px #0f172a59}.mc-chart__tooltip{position:absolute;min-width:160px;max-width:220px;padding:.75rem .9rem;border-radius:.9rem;background:#0f172aeb;color:#f8fafc;box-shadow:0 12px 35px #0f172a66;transform:translate(-50%,-110%);will-change:transform;display:flex;flex-direction:column;gap:.45rem}.mc-chart__tooltip-series{display:flex;gap:.5rem;align-items:center;font-size:.8rem;letter-spacing:.04em;text-transform:uppercase;opacity:.8}.mc-chart__swatch{width:10px;height:10px;border-radius:50%;display:inline-block}.mc-chart__tooltip-metric{display:flex;flex-direction:column;gap:.15rem}.mc-chart__tooltip-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#f8fafca6}.mc-chart__tooltip-value{font-size:1.25rem;font-weight:600;letter-spacing:-.02em}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1.NgIf, selector: "[ngIf]", inputs: ["ngIf", "ngIfThen", "ngIfElse"] }], changeDetection: i0.ChangeDetectionStrategy.OnPush });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.2", ngImport: i0, type: ChartComponent, decorators: [{
            type: Component,
            args: [{ selector: 'mc-chart', standalone: true, imports: [CommonModule], template: `
    <div class="mc-chart" #wrapper>
      <canvas
        #canvas
        (pointermove)="handlePointer($event)"
        (pointerleave)="clearPointerState()"
        (pointercancel)="clearPointerState()"
      ></canvas>
      <div class="mc-chart__overlay" *ngIf="overlayVisible">
        <div
          *ngIf="crosshairState"
          class="mc-chart__crosshair mc-chart__crosshair--x"
          [style.left.px]="crosshairState.x"
        ></div>
        <div
          *ngIf="crosshairState"
          class="mc-chart__crosshair mc-chart__crosshair--y"
          [style.top.px]="crosshairState.y"
        ></div>
        <div
          *ngIf="tooltipState"
          class="mc-chart__dot"
          [style.left.px]="tooltipState.x"
          [style.top.px]="tooltipState.y"
          [style.border-color]="tooltipState.color"
          [style.background]="tooltipState.dotFill"
        ></div>
        <div
          *ngIf="tooltipState"
          class="mc-chart__tooltip"
          [style.left.px]="tooltipState.left"
          [style.top.px]="tooltipState.top"
        >
          <div class="mc-chart__tooltip-series">
            <span class="mc-chart__swatch" [style.background]="tooltipState.color"></span>
            <span>{{ tooltipState.seriesName || 'Series' }}</span>
          </div>
          <div class="mc-chart__tooltip-metric">
            <span class="mc-chart__tooltip-label">{{ tooltipState.label }}</span>
            <span class="mc-chart__tooltip-value">{{ tooltipState.value }}</span>
          </div>
        </div>
      </div>
    </div>
  `, changeDetection: ChangeDetectionStrategy.OnPush, styles: [":host{display:block;width:100%;height:100%;min-height:240px}.mc-chart{position:relative;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;display:block}.mc-chart__overlay{pointer-events:none;position:absolute;inset:0;font-family:inherit}.mc-chart__crosshair{position:absolute;background:#2563eb4d;-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px)}.mc-chart__crosshair--x{top:0;bottom:0;width:1px;transform:translate(-.5px)}.mc-chart__crosshair--y{left:0;right:0;height:1px;transform:translateY(-.5px)}.mc-chart__dot{position:absolute;width:12px;height:12px;border-radius:999px;border:2px solid;transform:translate(-50%,-50%);box-shadow:0 4px 16px #0f172a59}.mc-chart__tooltip{position:absolute;min-width:160px;max-width:220px;padding:.75rem .9rem;border-radius:.9rem;background:#0f172aeb;color:#f8fafc;box-shadow:0 12px 35px #0f172a66;transform:translate(-50%,-110%);will-change:transform;display:flex;flex-direction:column;gap:.45rem}.mc-chart__tooltip-series{display:flex;gap:.5rem;align-items:center;font-size:.8rem;letter-spacing:.04em;text-transform:uppercase;opacity:.8}.mc-chart__swatch{width:10px;height:10px;border-radius:50%;display:inline-block}.mc-chart__tooltip-metric{display:flex;flex-direction:column;gap:.15rem}.mc-chart__tooltip-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:#f8fafca6}.mc-chart__tooltip-value{font-size:1.25rem;font-weight:600;letter-spacing:-.02em}\n"] }]
        }], propDecorators: { config: [{
                type: Input,
                args: [{ required: true }]
            }], canvasRef: [{
                type: ViewChild,
                args: ['canvas', { static: true }]
            }], wrapperRef: [{
                type: ViewChild,
                args: ['wrapper', { static: true }]
            }] } });

function provideModernCharts(options = {}) {
    const { seriesRenderers = [] } = options;
    return [
        {
            provide: ENVIRONMENT_INITIALIZER,
            multi: true,
            useFactory: () => {
                const injector = inject(Injector);
                return () => {
                    const factory = injector.get(ChartEngineFactory);
                    seriesRenderers.forEach((renderer) => factory.registerSeriesRenderer(renderer));
                };
            },
        },
    ];
}

/**
 * Generated bundle index. Do not edit.
 */

export { ChartComponent, ChartEngine, ChartEngineFactory, ChartRegistry, provideModernCharts };
//# sourceMappingURL=modern-charts.mjs.map
