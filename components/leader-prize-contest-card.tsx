"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  ColorType,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { price } from "@/lib/format";
import type { PlatformMarket } from "@/lib/platform";
import { InfoSheet, SheetBlock } from "./info-sheet";
import { Row } from "./ui";

const SAMPLE_MS = 15_000;
const MAX_SAMPLES = 600;
const DROP_TARGET = 0.95;

type Sample = [number, number]; // [unix seconds, price]

const dayId = () => Math.floor(Date.now() / 1000 / 86400);
const storageKey = (day: number) => `cx_price_samples_${day}`;

function loadSamples(): Sample[] {
  try {
    const raw = localStorage.getItem(storageKey(dayId()));
    const parsed = raw ? (JSON.parse(raw) as Sample[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSamples(samples: Sample[]) {
  try {
    localStorage.setItem(storageKey(dayId()), JSON.stringify(samples.slice(-MAX_SAMPLES)));
  } catch {}
}

/** Prices seen while the app is open today (UTC), kept in this browser only. */
function useTodaysPrices(spot?: number) {
  const [samples, setSamples] = useState<Sample[]>(loadSamples);
  const spotRef = useRef(spot);

  useEffect(() => {
    spotRef.current = spot;
  }, [spot]);

  useEffect(() => {
    const tick = () => {
      const p = spotRef.current;
      if (!p) return;
      const now = Math.floor(Date.now() / 1000);
      setSamples((prev) => {
        const last = prev[prev.length - 1];
        if (last && last[1] === p && now - last[0] < 60) return prev;
        const next = [...prev, [now, p] as Sample].slice(-MAX_SAMPLES);
        saveSamples(next);
        return next;
      });
    };
    const first = setTimeout(tick, 500);
    const id = setInterval(tick, SAMPLE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return samples;
}

export function LeaderPrizeContestCard({ market }: { market?: PlatformMarket }) {
  const spot = market?.spotPrice ? Number(market.spotPrice) / 1e18 : undefined;
  const samples = useTodaysPrices(spot);

  const contestHigh = market?.contestDayHigh ? Number(market.contestDayHigh) / 1e18 : 0;
  const sampleHigh = samples.reduce((m, s) => Math.max(m, s[1]), 0);
  const dayHigh = Math.max(contestHigh, sampleHigh, spot ?? 0);
  const target = dayHigh * DROP_TARGET;
  const current = spot ?? samples[samples.length - 1]?.[1];

  const downPct = current && dayHigh > 0 ? Math.max(0, (1 - current / dayHigh) * 100) : 0;
  const reached = !!market?.contestTriggered || (!!current && dayHigh > 0 && current <= target);

  const fmt = (v: number) => price(BigInt(Math.round(v * 1e18)));

  // TradingView Lightweight Charts: live price area with the day high and the 5% drop target lines
  const chartBox = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);

  useEffect(() => {
    const box = chartBox.current;
    if (!box) return;
    const chart = createChart(box, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#b9c2bc", fontFamily: "inherit" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.06)" } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 } },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#3ddc84",
      topColor: "rgba(61,220,132,0.35)",
      bottomColor: "rgba(61,220,132,0)",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 4, minMove: 0.0001 },
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      linesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    // Times must be strictly increasing, one point per second
    const data: { time: UTCTimestamp; value: number }[] = [];
    for (const [t, p] of samples) {
      const last = data[data.length - 1];
      if (last && last.time >= t) continue;
      data.push({ time: t as UTCTimestamp, value: p });
    }
    if (data.length === 0 && current) data.push({ time: Math.floor(Date.now() / 1000) as UTCTimestamp, value: current });
    series.setData(data);

    linesRef.current.forEach((l) => series.removePriceLine(l));
    linesRef.current = [];
    if (dayHigh > 0) {
      linesRef.current.push(
        series.createPriceLine({ price: dayHigh, color: "rgba(255,255,255,0.5)", lineWidth: 1, lineStyle: LineStyle.Dashed, title: "Day high" }),
        series.createPriceLine({ price: target, color: "#ff5d7a", lineWidth: 2, lineStyle: LineStyle.Dashed, title: "-5% target" })
      );
    }
    chart.timeScale().fitContent();
  }, [samples, dayHigh, target, current]);

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Leader prize contest">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">Leader prize contest</h3>
        <InfoSheet title="Leader prize contest">
          <p>
            The contest pays out on days when the CARB price falls 5% or more below that day&apos;s high. The dashed red
            line is that 5% target. If the price touches it, the day&apos;s contest is triggered.
          </p>
          <SheetBlock title="Today">
            <dl>
              <Row label="Day high" value={dayHigh ? fmt(dayHigh) : "—"} />
              <Row label="5% target" value={dayHigh ? fmt(target) : "—"} accent />
            </dl>
          </SheetBlock>
          <p>The line shows prices seen while this app is open today, so it fills in as you keep it open.</p>
        </InfoSheet>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold text-white">{current ? fmt(current) : "—"}</span>
        <span className="text-xs text-muted">CARB price now</span>
      </div>

      <div ref={chartBox} className="h-[220px] w-full" aria-label="CARB price today with the 5% drop target" />

      <dl className="flex flex-col">
        <div className="flex items-center gap-3 border-t border-white/[0.08] py-3 text-sm first:border-t-0">
          <span className="size-3 shrink-0 rounded-full bg-white/40" />
          <dt className="min-w-0 flex-1 truncate text-white">Day high</dt>
          <dd className="shrink-0 font-semibold text-white">{dayHigh ? fmt(dayHigh) : "—"}</dd>
        </div>
        <div className="flex items-center gap-3 border-t border-white/[0.08] py-3 text-sm">
          <span className="size-3 shrink-0 rounded-full" style={{ background: "#ff5d7a" }} />
          <dt className="min-w-0 flex-1 truncate text-white">5% drop target</dt>
          <dd className="shrink-0 font-semibold text-white">{dayHigh ? fmt(target) : "—"}</dd>
        </div>
        <div className="flex items-center gap-3 border-t border-white/[0.08] py-3 text-sm">
          <span className="size-3 shrink-0 rounded-full" style={{ background: reached ? "#ff5d7a" : "#3ddc84" }} />
          <dt className="min-w-0 flex-1 truncate text-white">{reached ? "Contest triggered today" : "Down from day high"}</dt>
          <dd className="shrink-0 font-semibold text-white">{reached ? "5%+" : `${downPct.toFixed(1)}%`}</dd>
        </div>
      </dl>
    </section>
  );
}
