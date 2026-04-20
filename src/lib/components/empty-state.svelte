<script lang="ts">
	import { MapPinned, Search, Satellite, Sparkles } from 'lucide-svelte';
	import type { CuratedSatellite, LocationSearchResult } from '$lib/types/orbital';

	type EmptyStateVariant = 'location' | 'passes';

	interface EmptyStateProps {
		variant: EmptyStateVariant;
		location?: LocationSearchResult | null;
		satellite?: CuratedSatellite | null;
	}

	let { variant, location = null, satellite = null }: EmptyStateProps = $props();

	const copy = $derived(
		variant === 'location'
			? {
					eyebrow: 'Choose a place first',
					title: 'Start with a city, beach, or backyard',
					body: 'Orbital Window needs a real point on Earth before it can turn orbital math into practical viewing times.',
					hints: [
						'Search for a city or a saved spot.',
						'Then pick one satellite to simplify the story.',
						'Pass cards appear only when the object comes close enough to matter.'
					]
				}
			: {
					eyebrow: 'Nothing useful yet',
					title: location
						? `No promising passes over ${location.name} right now`
						: 'No promising passes right now',
					body: satellite
						? `${satellite.name} is either too low, too cloudy, or simply not passing at a useful time in the current window.`
						: 'The current forecast and orbit timing do not line up well enough to show a strong viewing opportunity yet.',
					hints: [
						'Try another satellite to compare pass quality.',
						'Check back later as the orbit track advances.',
						'Night passes with lower cloud cover usually score best.'
					]
				}
	);
</script>

<section
	class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_38%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] p-7 text-slate-100 shadow-[0_24px_90px_rgba(2,6,23,0.55)] sm:p-9"
>
	<div
		class="absolute inset-0 opacity-80"
		style="background: radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.16), transparent 32%), radial-gradient(circle at 85% 12%, rgba(168, 85, 247, 0.14), transparent 28%);"
	></div>

	<div
		class="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)] lg:items-center"
	>
		<div class="space-y-4">
			<div
				class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.26em] text-slate-300 uppercase"
			>
				<Sparkles size={14} />
				{copy.eyebrow}
			</div>

			<h2
				class="max-w-xl font-[Georgia,ui-serif,serif] text-3xl font-semibold tracking-tight text-white sm:text-4xl"
			>
				{copy.title}
			</h2>

			<p class="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
				{copy.body}
			</p>

			<ul class="grid gap-3 sm:grid-cols-3">
				{#each copy.hints as hint (hint)}
					<li
						class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-slate-300"
					>
						{hint}
					</li>
				{/each}
			</ul>
		</div>

		<div
			class="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6"
		>
			<div
				class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent"
			></div>
			<div class="flex min-h-[16rem] flex-col justify-between">
				<div class="flex items-start justify-between gap-4">
					<div class="space-y-2">
						<div class="text-[0.68rem] font-semibold tracking-[0.26em] text-slate-500 uppercase">
							Current state
						</div>
						<div class="text-lg font-semibold text-white">
							{variant === 'location'
								? 'Waiting for a ground location'
								: 'Waiting for a stronger pass'}
						</div>
					</div>

					<div
						class="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100"
					>
						{#if variant === 'location'}
							<Search size={20} />
						{:else}
							<Satellite size={20} />
						{/if}
					</div>
				</div>

				<div class="relative mx-auto mt-6 flex h-36 w-36 items-center justify-center">
					<div class="absolute inset-0 rounded-full border border-cyan-300/15"></div>
					<div class="absolute inset-4 rounded-full border border-cyan-300/10"></div>
					<div class="absolute inset-10 rounded-full border border-cyan-300/8"></div>
					<div
						class="absolute h-24 w-24 rounded-full bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/14 blur-xl"
					></div>
					<div
						class="absolute flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-slate-950/90 text-white"
					>
						{#if variant === 'location'}
							<MapPinned size={22} />
						{:else}
							<Satellite size={22} />
						{/if}
					</div>
				</div>

				<div
					class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-slate-300"
				>
					{#if variant === 'location'}
						Once you pick a place, Orbital Window can turn orbit predictions into “when should I
						look up?” answers.
					{:else}
						No strong pass does not mean nothing is happening. It usually means this location, time,
						and sky quality are not aligned yet.
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>
