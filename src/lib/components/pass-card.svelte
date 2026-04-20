<script lang="ts">
	import { ArrowUpRight, Compass, Timer, TrendingUp } from 'lucide-svelte';
	import WeatherChip from './weather-chip.svelte';
	import type { CuratedSatellite, OverheadPass } from '$lib/types/orbital';

	interface PassCardProps {
		pass: OverheadPass;
		satellite?: CuratedSatellite | null;
		timezone?: string | null;
		emphasize?: boolean;
	}

	let { pass, satellite = null, timezone = null, emphasize = false }: PassCardProps = $props();

	const accent = $derived(satellite?.theme.accent ?? '#60a5fa');
	const glow = $derived(satellite?.theme.glow ?? 'rgba(96, 165, 250, 0.24)');
	const localFormatter = $derived(
		new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: timezone ?? undefined
		})
	);
	const dateFormatter = $derived(
		new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: timezone ?? undefined
		})
	);

	const startLabel = $derived(localFormatter.format(new Date(pass.startTime)));
	const peakLabel = $derived(localFormatter.format(new Date(pass.peakTime)));
	const endLabel = $derived(localFormatter.format(new Date(pass.endTime)));
	const dayLabel = $derived(dateFormatter.format(new Date(pass.peakTime)));
	const scorePercent = $derived(Math.max(8, Math.min(100, Math.round(pass.visibilityScore))));
	const scoreCopy = $derived(getScoreCopy(pass.visibilityScore));

	function getScoreCopy(score: number) {
		if (score >= 80) {
			return 'Easy to recommend';
		}

		if (score >= 60) {
			return 'Worth stepping outside for';
		}

		if (score >= 40) {
			return 'Catch it if timing works';
		}

		return 'Low-confidence viewing';
	}
</script>

<article
	class:emphasize
	class="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/82 p-5 text-slate-100 shadow-[0_20px_90px_rgba(2,6,23,0.45)]"
	style={`--accent:${accent}; --glow:${glow};`}
>
	<div
		class="absolute inset-0 opacity-70"
		style={`background: radial-gradient(circle at top left, ${glow} 0%, transparent 42%);`}
	></div>

	<div class="relative flex h-full flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="text-[0.68rem] font-semibold tracking-[0.26em] text-slate-400 uppercase">
					{dayLabel}
				</p>
				<h3
					class="mt-2 font-[Georgia,ui-serif,serif] text-2xl font-semibold tracking-tight text-white"
				>
					Peak at {peakLabel}
				</h3>
				<p class="mt-1 text-sm text-slate-300">
					{satellite ? `${satellite.name} ` : ''}{scoreCopy}
				</p>
			</div>

			<div class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
				<div class="text-[0.68rem] tracking-[0.22em] text-slate-400 uppercase">Visibility</div>
				<div class="mt-1 text-lg font-semibold text-white">
					{Math.round(pass.visibilityScore)}/100
				</div>
			</div>
		</div>

		<div class="grid gap-3 sm:grid-cols-3">
			<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
				<div class="flex items-center gap-2 text-slate-400">
					<Timer size={15} />
					<span class="text-[0.68rem] tracking-[0.22em] uppercase">Window</span>
				</div>
				<div class="mt-3 text-xl font-semibold text-white">
					{Math.round(pass.durationMinutes)} min
				</div>
				<p class="mt-1 text-sm text-slate-300">{startLabel} to {endLabel}</p>
			</div>

			<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
				<div class="flex items-center gap-2 text-slate-400">
					<TrendingUp size={15} />
					<span class="text-[0.68rem] tracking-[0.22em] uppercase">Highest point</span>
				</div>
				<div class="mt-3 text-xl font-semibold text-white">{Math.round(pass.maxElevationDeg)}°</div>
				<p class="mt-1 text-sm text-slate-300">Higher angles feel easier to spot.</p>
			</div>

			<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
				<div class="flex items-center gap-2 text-slate-400">
					<Compass size={15} />
					<span class="text-[0.68rem] tracking-[0.22em] uppercase">Sky path</span>
				</div>
				<div class="mt-3 text-lg font-semibold text-white">
					{pass.startBearing} → {pass.endBearing}
				</div>
				<p class="mt-1 text-sm text-slate-300">
					Start looking {pass.startBearing.toLowerCase()}, then follow it across.
				</p>
			</div>
		</div>

		<div>
			<div
				class="flex items-center justify-between text-xs font-semibold tracking-[0.22em] text-slate-400 uppercase"
			>
				<span>Confidence meter</span>
				<span>{scoreCopy}</span>
			</div>
			<div class="mt-3 h-2.5 overflow-hidden rounded-full bg-white/8">
				<div
					class="h-full rounded-full"
					style={`width:${scorePercent}%; background:linear-gradient(90deg, color-mix(in srgb, ${accent} 58%, white 12%), ${accent}); box-shadow:0 0 24px ${glow};`}
				></div>
			</div>
		</div>

		<div class="flex flex-wrap gap-2.5">
			<WeatherChip kind="daylight" {pass} />
			<WeatherChip kind="cloud-cover" {pass} />
			<WeatherChip kind="visibility" {pass} />
		</div>

		<div
			class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-slate-300"
		>
			<div class="flex items-center gap-2 font-medium text-white">
				<ArrowUpRight size={16} />
				How to read this pass
			</div>
			<p class="mt-2">
				Be outside a few minutes before {startLabel}, face {pass.startBearing.toLowerCase()}, and
				expect the strongest view around {peakLabel}.
			</p>
		</div>
	</div>
</article>

<style>
	article.emphasize {
		border-color: color-mix(in srgb, var(--accent) 58%, white 16%);
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--accent) 34%, transparent),
			0 26px 110px rgba(2, 6, 23, 0.62);
	}
</style>
