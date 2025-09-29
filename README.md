# Modern Charts

A canvas-powered, highly themeable charting engine for Angular standalone applications. Modern Charts offers declarative configuration, sane defaults, and an extensible plugin system so teams can render polished data visualizations without wrestling with imperative chart APIs.

## Highlights

- **Angular-first**: ships a standalone `<mc-chart>` component, hydration-friendly providers, and strong typing for all configuration objects.
- **Composable configs**: describe data, axes, layout, interactions, and theming through the `ChartConfig` interface.
- **Plugin-ready**: register additional series renderers (or override the built-ins) using `provideModernCharts`.
- **Theme tokens**: customize palettes, typography, stroke widths, and more with partial overrides.

## Getting Started

1. Build and (optionally) publish the library:

   ```bash
   ng build modern-charts
   # npm publish dist/modern-charts   # once you are ready to share it
   ```

2. Provide the chart engine once in your bootstrap configuration:

   ```ts
   import { provideModernCharts } from 'modern-charts';

   export const appConfig: ApplicationConfig = {
     providers: [
       ...provideModernCharts(),
     ],
   };
   ```

3. Render charts with the standalone component:

   ```ts
   import { Component } from '@angular/core';
   import { ChartComponent, ChartConfig } from 'modern-charts';

   @Component({
     selector: 'app-analytics',
     standalone: true,
     imports: [ChartComponent],
     template: `<mc-chart [config]="chart"></mc-chart>`,
   })
   export class AnalyticsComponent {
     protected readonly chart: ChartConfig = {
       data: {
         series: [
           { type: 'line', name: 'Traffic', data: [120, 180, 160, 220] },
         ],
       },
       axes: [
         { id: 'x', position: 'bottom', tickCount: 3 },
         { id: 'y', position: 'left', tickCount: 5 },
       ],
       layout: { autoFit: true },
     };
   }
   ```

## Configuration Surface

```ts
export interface ChartConfig {
  data: {
    series: ChartSeries[];         // line, area, bar, scatter (line & area ship today)
    labels?: (string | number)[];  // optional categorical labels
  };
  axes?: ChartAxisConfig[];        // formatter hooks, tick counts, positions
  legend?: ChartLegendConfig;      // placement + visibility
  layout?: ChartLayoutConfig;      // padding + autofit
  theme?: Partial<ChartTheme>;     // palette, background, axis + series tokens
  animation?: ChartAnimationConfig;
  interactions?: ChartInteractionConfig;
}
```

Each `ChartSeries` carries its own stroke width, color, and optional curve hints. When no color is supplied, the active theme palette is used.

## Extending with Custom Renderers

Add your own series types by implementing `ChartSeriesRenderer` and registering it through the environment initializer:

```ts
import { ChartSeriesRenderer, provideModernCharts } from 'modern-charts';

class SparkSeriesRenderer implements ChartSeriesRenderer {
  readonly type = 'spark';
  render(context: SeriesRenderContext): void {
    // custom canvas drawing logic goes here
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    ...provideModernCharts({
      seriesRenderers: [new SparkSeriesRenderer()],
    }),
  ],
};
```

## Scripts

- `ng build modern-charts` – compile the library to `dist/`.
- `ng test` – run unit tests (including the chart engine smoke test).

## Roadmap Ideas

- Additional renderers (bar, scatter, stacked variants).
- Interaction plugins (tooltips, crosshair, zoom/pan) built on top of the existing hooks.
- Visual regression testing harness for chart output.

Contributions and feedback are welcome!
