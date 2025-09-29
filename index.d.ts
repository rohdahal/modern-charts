import * as i0 from '@angular/core';
import { AfterViewInit, OnChanges, OnDestroy, SimpleChanges, Provider } from '@angular/core';

type ChartSeriesType = 'line' | 'area' | 'bar' | 'scatter';
interface ChartPoint {
    x: number;
    y: number;
}
interface ChartSeries {
    id?: string;
    name?: string;
    type: ChartSeriesType;
    data: Array<number | ChartPoint | [number, number]>;
    color?: string;
    strokeWidth?: number;
    fillOpacity?: number;
    curve?: 'linear' | 'monotone' | 'step';
    options?: Record<string, unknown>;
}
interface ChartAxisConfig {
    id: string;
    position: 'left' | 'right' | 'top' | 'bottom';
    label?: string;
    type?: 'linear' | 'band' | 'time';
    tickCount?: number;
    grid?: boolean;
    formatter?: (value: number) => string;
    min?: number;
    max?: number;
}
interface ChartLegendConfig {
    position?: 'top' | 'bottom' | 'left' | 'right';
    show?: boolean;
}
interface ChartLayoutConfig {
    padding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
    autoFit?: boolean;
}
interface ChartAnimationConfig {
    enabled?: boolean;
    durationMs?: number;
    easing?: (value: number) => number;
}
interface ChartInteractionConfig {
    crosshair?: boolean;
    tooltip?: boolean;
    zoom?: boolean;
    pan?: boolean;
}
interface ChartTheme {
    background: string;
    palette: string[];
    axis: {
        color: string;
        labelColor: string;
        gridColor: string;
        fontSize: number;
        fontFamily: string;
    };
    legend: {
        color: string;
        fontSize: number;
        fontFamily: string;
    };
    series: {
        strokeWidth: number;
        pointRadius: number;
        areaOpacity: number;
    };
}
type DeepPartial<T> = T extends Array<infer Item> ? Array<DeepPartial<Item>> : T extends object ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : T;
type ChartThemeOverrides = DeepPartial<ChartTheme>;
interface ChartConfig {
    data: {
        labels?: (string | number)[];
        series: ChartSeries[];
    };
    axes?: ChartAxisConfig[];
    legend?: ChartLegendConfig;
    layout?: ChartLayoutConfig;
    theme?: ChartThemeOverrides;
    animation?: ChartAnimationConfig;
    interactions?: ChartInteractionConfig;
}
interface ResolvedChartLayout {
    width: number;
    height: number;
    padding: Required<Record<'top' | 'right' | 'bottom' | 'left', number>>;
}
interface SeriesRenderContext {
    ctx: CanvasRenderingContext2D;
    config: ChartConfig;
    theme: ChartTheme;
    layout: ResolvedChartLayout;
    series: ChartSeries;
    points: {
        x: number;
        y: number;
    }[];
    seriesIndex: number;
    xScale: (value: number) => number;
    yScale: (value: number) => number;
}
interface ChartSeriesRenderer {
    readonly type: ChartSeriesType;
    render(context: SeriesRenderContext): void;
}
interface ChartRenderPoint {
    seriesIndex: number;
    pointIndex: number;
    value: {
        x: number;
        y: number;
    };
    canvasX: number;
    canvasY: number;
    series: ChartSeries;
}
interface ChartRenderResult {
    layout: ResolvedChartLayout;
    theme: ChartTheme;
    config: ChartConfig;
    points: ChartRenderPoint[];
}

declare class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    private readonly platformId;
    private readonly engineFactory;
    private readonly cdr;
    private resizeObserver?;
    private engine?;
    private renderState?;
    config: ChartConfig;
    private canvasRef;
    private wrapperRef;
    ngAfterViewInit(): void;
    ngOnChanges(changes: SimpleChanges): void;
    ngOnDestroy(): void;
    private render;
    private isBrowser;
    protected get overlayVisible(): boolean;
    protected tooltipState?: {
        x: number;
        y: number;
        left: number;
        top: number;
        label: string;
        value: string;
        seriesName?: string;
        color: string;
        dotFill: string;
    };
    protected crosshairState?: {
        x: number;
        y: number;
    };
    handlePointer(event: PointerEvent): void;
    clearPointerState(mark?: boolean): void;
    private isInteractionEnabled;
    private getNearestPoint;
    private buildTooltipState;
    private getLabelForPoint;
    private formatValue;
    private clamp;
    private applyAlpha;
    static ɵfac: i0.ɵɵFactoryDeclaration<ChartComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<ChartComponent, "mc-chart", never, { "config": { "alias": "config"; "required": true; }; }, {}, never, never, true, never>;
}

declare class ChartRegistry {
    private readonly seriesRenderers;
    registerSeriesRenderer(renderer: ChartSeriesRenderer): void;
    getSeriesRenderer(type: ChartSeriesType): ChartSeriesRenderer | undefined;
    getRegisteredTypes(): ChartSeriesType[];
}

declare class ChartEngine {
    private readonly registry;
    private theme;
    constructor(registry: ChartRegistry);
    setTheme(theme: ChartThemeOverrides | undefined): void;
    render(canvas: HTMLCanvasElement, config: ChartConfig): ChartRenderResult | undefined;
    private prepareCanvas;
    private resolveLayout;
    private normalizeSeries;
    private combineDomain;
    private drawAxes;
    private drawGrid;
    private formatAxisValue;
}

declare class ChartEngineFactory {
    private readonly registry;
    private defaultsRegistered;
    registerSeriesRenderer(renderer: ChartSeriesRenderer): void;
    create(): ChartEngine;
    private ensureDefaultRenderers;
    static ɵfac: i0.ɵɵFactoryDeclaration<ChartEngineFactory, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ChartEngineFactory>;
}

interface ModernChartsOptions {
    seriesRenderers?: ChartSeriesRenderer[];
}
declare function provideModernCharts(options?: ModernChartsOptions): Provider[];

export { ChartComponent, ChartEngine, ChartEngineFactory, ChartRegistry, provideModernCharts };
export type { ChartAnimationConfig, ChartAxisConfig, ChartConfig, ChartInteractionConfig, ChartLayoutConfig, ChartLegendConfig, ChartPoint, ChartRenderPoint, ChartRenderResult, ChartSeries, ChartSeriesRenderer, ChartSeriesType, ChartTheme, ChartThemeOverrides, DeepPartial, ModernChartsOptions, ResolvedChartLayout, SeriesRenderContext };
