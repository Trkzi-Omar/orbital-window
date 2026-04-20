<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Radio, Telescope, CloudSun, Earth } from 'lucide-svelte';
	import type { SatelliteSnapshot } from '$lib/types/orbital';

	interface SatelliteStripProps {
		snapshots: SatelliteSnapshot[];
		selectedSatelliteId?: string | null;
	}

	const groupIcons = {
		station: Radio,
		science: Telescope,
		weather: CloudSun,
		earth: Earth
	} as const;

	const dispatch = createEventDispatcher<{
		select: { satelliteId: string; snapshot: SatelliteSnapshot };
	}>();

	let { snapshots, selectedSatelliteId = null }: SatelliteStripProps = $props();

	function handleSelect(snapshot: SatelliteSnapshot) {
		dispatch('select', {
			satelliteId: snapshot.satellite.id,
			snapshot
		});
	}

	function formatAltitude(value: number | null) {
		if (value === null || !Number.isFinite(value)) {
			return 'Live altitude soon';
		}

		return `${Math.round(value)} km up`;
	}

	function describePassCount(count: number) {
		if (count === 0) {
			return 'No predicted passes';
		}

		if (count === 1) {
			return '1 pass queued';
		}

		return `${count} passes queued`;
	}
</script>

<section class="space-y-3">
	<div class="flex items-end justify-between gap-4">
		<div>
			<p class="text-[0.68rem] font-semibold tracking-[0.28em] text-slate-400 uppercase">
				Pick an object
			</p>
			<h2
				class="mt-2 font-[Georgia,ui-serif,serif] text-2xl font-semibold tracking-tight text-slate-100"
			>
				Compare what is flying overhead
			</h2>
		</div>
		<p class="max-w-sm text-right text-sm leading-relaxed text-slate-400">
			These cards stay compact on purpose: choose one satellite, then read its path and passes
			without wading through orbital jargon.
		</p>
	</div>

	<div class="flex snap-x gap-3 overflow-x-auto pb-2">
		{#each snapshots as snapshot (snapshot.satellite.id)}
			{@const selected = snapshot.satellite.id === selectedSatelliteId}
			{@const Icon = groupIcons[snapshot.satellite.group]}

			<button
				type="button"
				class:selected
				class="group relative min-w-[17rem] snap-start overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/85 p-4 text-left shadow-[0_20px_80px_rgba(2,6,23,0.45)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/70"
				style={`--accent:${snapshot.satellite.theme.accent}; --glow:${snapshot.satellite.theme.glow};`}
				aria-pressed={selected}
				onclick={() => handleSelect(snapshot)}
			>
				<div
					class="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
					style={`background: radial-gradient(circle at top left, ${snapshot.satellite.theme.glow} 0%, transparent 48%);`}
				></div>
				<div class="relative space-y-4">
					<div class="flex items-start justify-between gap-3">
						<div
							class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.24em] text-slate-300 uppercase"
						>
							<Icon size={14} />
							{snapshot.satellite.group}
						</div>
						<div
							class="rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.24em] uppercase"
							style={`border-color:${selected ? snapshot.satellite.theme.accent : 'rgba(255,255,255,0.12)'}; color:${selected ? snapshot.satellite.theme.accent : 'rgba(226,232,240,0.8)'}`}
						>
							{selected ? 'Selected' : 'View'}
						</div>
					</div>

					<div>
						<h3
							class="font-[Georgia,ui-serif,serif] text-xl font-semibold tracking-tight text-white"
						>
							{snapshot.satellite.name}
						</h3>
						<p class="mt-1 text-sm text-slate-300">{snapshot.satellite.tagline}</p>
					</div>

					<div class="grid grid-cols-2 gap-3 text-sm">
						<div class="rounded-xl border border-white/10 bg-white/5 p-3">
							<div class="text-[0.68rem] tracking-[0.2em] text-slate-500 uppercase">
								Overhead window
							</div>
							<div class="mt-2 font-medium text-white">
								{describePassCount(snapshot.nextPasses.length)}
							</div>
						</div>
						<div class="rounded-xl border border-white/10 bg-white/5 p-3">
							<div class="text-[0.68rem] tracking-[0.2em] text-slate-500 uppercase">
								Current state
							</div>
							<div class="mt-2 font-medium text-white">
								{formatAltitude(snapshot.currentAltitudeKm)}
							</div>
						</div>
					</div>

					<p class="text-sm leading-relaxed text-slate-400">
						{snapshot.satellite.description}
					</p>
				</div>
			</button>
		{/each}
	</div>
</section>

<style>
	button.selected {
		border-color: color-mix(in srgb, var(--accent) 56%, white 16%);
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--accent) 34%, transparent),
			0 26px 90px rgba(2, 6, 23, 0.55);
		background:
			radial-gradient(circle at top left, var(--glow) 0%, transparent 42%), rgba(2, 6, 23, 0.96);
	}
</style>
