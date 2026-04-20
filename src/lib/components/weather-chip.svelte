<script lang="ts">
	import { Cloud, Eye, MoonStar, SunMedium } from 'lucide-svelte';
	import type { OverheadPass } from '$lib/types/orbital';

	type WeatherChipKind = 'cloud-cover' | 'daylight' | 'visibility';

	interface WeatherChipProps {
		kind: WeatherChipKind;
		pass: Pick<OverheadPass, 'cloudCoverAtPeak' | 'nightWindow' | 'visibilityScore'>;
		compact?: boolean;
	}

	let { kind, pass, compact = false }: WeatherChipProps = $props();

	const chipConfig = $derived(getChipConfig(kind, pass));

	function getChipConfig(
		currentKind: WeatherChipKind,
		currentPass: Pick<OverheadPass, 'cloudCoverAtPeak' | 'nightWindow' | 'visibilityScore'>
	) {
		if (currentKind === 'cloud-cover') {
			const cloudCover = currentPass.cloudCoverAtPeak;

			if (cloudCover === null || !Number.isFinite(cloudCover)) {
				return {
					label: 'Clouds unknown',
					value: 'Forecast pending',
					Icon: Cloud,
					tone: 'rgba(148, 163, 184, 0.16)',
					color: '#cbd5e1'
				};
			}

			if (cloudCover <= 25) {
				return {
					label: 'Clearer sky',
					value: `${Math.round(cloudCover)}% cloud`,
					Icon: Cloud,
					tone: 'rgba(16, 185, 129, 0.18)',
					color: '#6ee7b7'
				};
			}

			if (cloudCover <= 60) {
				return {
					label: 'Patchy cloud',
					value: `${Math.round(cloudCover)}% cloud`,
					Icon: Cloud,
					tone: 'rgba(245, 158, 11, 0.18)',
					color: '#fcd34d'
				};
			}

			return {
				label: 'Cloud-heavy',
				value: `${Math.round(cloudCover)}% cloud`,
				Icon: Cloud,
				tone: 'rgba(239, 68, 68, 0.18)',
				color: '#fca5a5'
			};
		}

		if (currentKind === 'daylight') {
			return currentPass.nightWindow
				? {
						label: 'Night pass',
						value: 'Best for naked-eye spotting',
						Icon: MoonStar,
						tone: 'rgba(99, 102, 241, 0.18)',
						color: '#c4b5fd'
					}
				: {
						label: 'Daylight pass',
						value: 'Good for timing, harder to see',
						Icon: SunMedium,
						tone: 'rgba(250, 204, 21, 0.18)',
						color: '#fde68a'
					};
		}

		const score = Math.round(currentPass.visibilityScore);

		if (score >= 80) {
			return {
				label: 'Visibility score',
				value: `${score}/100 · Excellent`,
				Icon: Eye,
				tone: 'rgba(16, 185, 129, 0.18)',
				color: '#6ee7b7'
			};
		}

		if (score >= 60) {
			return {
				label: 'Visibility score',
				value: `${score}/100 · Good`,
				Icon: Eye,
				tone: 'rgba(59, 130, 246, 0.18)',
				color: '#93c5fd'
			};
		}

		if (score >= 40) {
			return {
				label: 'Visibility score',
				value: `${score}/100 · Fair`,
				Icon: Eye,
				tone: 'rgba(245, 158, 11, 0.18)',
				color: '#fcd34d'
			};
		}

		return {
			label: 'Visibility score',
			value: `${score}/100 · Low`,
			Icon: Eye,
			tone: 'rgba(239, 68, 68, 0.18)',
			color: '#fca5a5'
		};
	}
</script>

<div
	class:compact
	class="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-left"
	style={`background:${chipConfig.tone}; color:${chipConfig.color};`}
>
	<chipConfig.Icon size={compact ? 14 : 16} />
	<div class="min-w-0">
		<div class="text-[0.62rem] font-semibold tracking-[0.22em] uppercase opacity-80">
			{chipConfig.label}
		</div>
		<div class="truncate text-sm font-medium text-slate-100">{chipConfig.value}</div>
	</div>
</div>

<style>
	.compact {
		padding-inline: 0.75rem;
		padding-block: 0.45rem;
	}

	.compact :global(.text-sm) {
		font-size: 0.78rem;
		line-height: 1rem;
	}
</style>
