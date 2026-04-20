<script lang="ts">
	import { MapPinned, Orbit, TimerReset } from 'lucide-svelte';
	import type {
		LocationSearchResult,
		OrbitPoint,
		OverheadPass,
		SatelliteSnapshot
	} from '$lib/types/orbital';

	interface OrbitMapProps {
		snapshot: SatelliteSnapshot | null;
		location?: LocationSearchResult | null;
		highlightedPass?: OverheadPass | null;
		timezone?: string | null;
	}

	const width = 920;
	const height = 460;

	let {
		snapshot,
		location = null,
		highlightedPass = null,
		timezone = 'UTC'
	}: OrbitMapProps = $props();

	const orbitTrack = $derived(snapshot?.orbitTrack ?? []);
	const accent = $derived(snapshot?.satellite.theme.accent ?? '#8b9bb4');
	const glow = $derived(snapshot?.satellite.theme.glow ?? 'rgba(139, 155, 180, 0.24)');
	const currentPoint = $derived(findCurrentPoint(orbitTrack));
	const trackSegments = $derived(buildTrackSegments(orbitTrack));
	const timeLabels = $derived(buildTimeLabels(orbitTrack));
	const locationPoint = $derived(location ? projectPoint(location.lat, location.lon) : null);
	const nextPass = $derived(highlightedPass ?? snapshot?.nextPasses[0] ?? null);
	const summaryLabel = $derived(getSummaryLabel(snapshot, nextPass));

	function projectPoint(lat: number, lon: number) {
		const normalizedLon = ((lon + 540) % 360) - 180;

		return {
			x: ((normalizedLon + 180) / 360) * width,
			y: ((90 - lat) / 180) * height
		};
	}

	function buildTrackSegments(points: OrbitPoint[]) {
		const segments: string[] = [];
		let currentSegment = '';
		let previous: OrbitPoint | null = null;

		for (const point of points) {
			if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
				continue;
			}

			if (previous && Math.abs(point.lon - previous.lon) > 140) {
				if (currentSegment) {
					segments.push(currentSegment);
				}
				currentSegment = '';
			}

			const projected = projectPoint(point.lat, point.lon);
			currentSegment += `${currentSegment ? ' L ' : 'M '}${projected.x.toFixed(1)} ${projected.y.toFixed(1)}`;
			previous = point;
		}

		if (currentSegment) {
			segments.push(currentSegment);
		}

		return segments;
	}

	function findCurrentPoint(points: OrbitPoint[]) {
		const candidates = points.filter(
			(point) => Number.isFinite(point.lat) && Number.isFinite(point.lon)
		);
		return candidates.at(-1) ?? null;
	}

	function buildTimeLabels(points: OrbitPoint[]) {
		if (points.length < 3) {
			return [];
		}

		const indexes = [0, Math.floor(points.length / 2), points.length - 1];

		return indexes
			.map((index) => {
				const point = points[index];

				if (!point) {
					return null;
				}

				return {
					point,
					label: formatUtcTime(point.timestamp)
				};
			})
			.filter((entry): entry is { point: OrbitPoint; label: string } => Boolean(entry));
	}

	function formatUtcTime(timestamp: string) {
		const date = new Date(timestamp);

		if (Number.isNaN(date.getTime())) {
			return 'UTC';
		}

		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'UTC'
		}).format(date);
	}

	function formatLocalTime(timestamp: string) {
		const date = new Date(timestamp);

		if (Number.isNaN(date.getTime())) {
			return 'Unknown time';
		}

		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: timezone ?? 'UTC'
		}).format(date);
	}

	function formatMetric(value: number | null, suffix: string, digits = 0) {
		if (value === null || !Number.isFinite(value)) {
			return '—';
		}

		return `${value.toFixed(digits)} ${suffix}`;
	}

	function getSummaryLabel(
		currentSnapshot: SatelliteSnapshot | null,
		currentPass: OverheadPass | null
	) {
		if (!currentSnapshot) {
			return 'Pick a satellite to see where it travels over Earth.';
		}

		if (currentPass) {
			return `${currentSnapshot.satellite.name} peaks at ${formatLocalTime(currentPass.peakTime)} and reaches ${Math.round(currentPass.maxElevationDeg)}° above the horizon.`;
		}

		return `The bright line shows the next ground track for ${currentSnapshot.satellite.name}.`;
	}
</script>

<article
	class="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_40%),linear-gradient(180deg,#08111f_0%,#030712_100%)] p-5 text-slate-100 shadow-[0_32px_120px_rgba(2,6,23,0.55)] sm:p-6"
	style={`--accent:${accent}; --glow:${glow};`}
>
	<div
		class="absolute inset-0 opacity-70"
		style={`background: radial-gradient(circle at 15% 15%, ${glow} 0%, transparent 36%);`}
	></div>

	<div class="relative flex flex-col gap-5">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div class="max-w-2xl space-y-2">
				<div
					class="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.28em] text-slate-300 uppercase"
				>
					<Orbit size={14} />
					Ground track view
				</div>
				<h2
					class="font-[Georgia,ui-serif,serif] text-2xl font-semibold tracking-tight text-white sm:text-3xl"
				>
					{snapshot ? `${snapshot.satellite.name} over Earth` : 'Select a satellite to start'}
				</h2>
				<p class="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
					{summaryLabel}
				</p>
			</div>

			<div class="grid gap-3 text-sm text-slate-200 sm:min-w-[18rem] sm:grid-cols-3 lg:grid-cols-1">
				<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
					<div class="text-[0.68rem] tracking-[0.22em] text-slate-400 uppercase">Altitude now</div>
					<div class="mt-2 text-lg font-semibold text-white">
						{snapshot ? formatMetric(snapshot.currentAltitudeKm, 'km') : '—'}
					</div>
				</div>
				<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
					<div class="text-[0.68rem] tracking-[0.22em] text-slate-400 uppercase">Speed now</div>
					<div class="mt-2 text-lg font-semibold text-white">
						{snapshot ? formatMetric(snapshot.currentVelocityKps, 'km/s', 1) : '—'}
					</div>
				</div>
				<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
					<div class="text-[0.68rem] tracking-[0.22em] text-slate-400 uppercase">
						Next useful pass
					</div>
					<div class="mt-2 text-lg font-semibold text-white">
						{nextPass ? formatLocalTime(nextPass.peakTime) : 'No pass yet'}
					</div>
				</div>
			</div>
		</div>

		<div
			class="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(8,15,30,0.92))]"
		>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				class="block aspect-[2/1] h-auto w-full"
				aria-label={snapshot ? `${snapshot.satellite.name} orbit track` : 'Orbit map placeholder'}
				role="img"
			>
				<defs>
					<linearGradient id="orbital-sheen" x1="0%" x2="100%" y1="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(255,255,255,0.16)" />
						<stop offset="50%" stop-color="rgba(255,255,255,0.04)" />
						<stop offset="100%" stop-color="rgba(255,255,255,0)" />
					</linearGradient>
					<filter id="track-glow">
						<feGaussianBlur stdDeviation="7" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>

				<rect {width} {height} fill="rgba(2,6,23,0.95)" />
				<rect {width} {height} fill="url(#orbital-sheen)" />

				{#each [0.25, 0.5, 0.75] as ratio (ratio)}
					<line
						x1={width * ratio}
						x2={width * ratio}
						y1="0"
						y2={height}
						stroke="rgba(148,163,184,0.18)"
						stroke-dasharray="6 10"
					/>
				{/each}

				{#each [0.2, 0.4, 0.6, 0.8] as ratio (ratio)}
					<line
						x1="0"
						x2={width}
						y1={height * ratio}
						y2={height * ratio}
						stroke="rgba(148,163,184,0.16)"
						stroke-dasharray="6 10"
					/>
				{/each}

				{#each trackSegments as segment (segment)}
					<path
						d={segment}
						fill="none"
						stroke={accent}
						stroke-linecap="round"
						stroke-width="6"
						opacity="0.22"
						filter="url(#track-glow)"
					/>
					<path d={segment} fill="none" stroke={accent} stroke-linecap="round" stroke-width="2.4" />
				{/each}

				{#each timeLabels as label (label.point.timestamp)}
					{@const point = projectPoint(label.point.lat, label.point.lon)}
					<circle cx={point.x} cy={point.y} r="4.5" fill={accent} />
					<text
						x={point.x + 10}
						y={point.y - 10}
						font-size="14"
						fill="rgba(226,232,240,0.9)"
						font-family="ui-sans-serif, system-ui, sans-serif"
					>
						{label.label} UTC
					</text>
				{/each}

				{#if locationPoint}
					<circle cx={locationPoint.x} cy={locationPoint.y} r="12" fill="rgba(148,163,184,0.14)" />
					<circle cx={locationPoint.x} cy={locationPoint.y} r="6" fill="#f8fafc" />
					<circle cx={locationPoint.x} cy={locationPoint.y} r="2.6" fill="#0f172a" />
					<text
						x={Math.min(locationPoint.x + 14, width - 80)}
						y={Math.max(locationPoint.y - 12, 24)}
						font-size="14"
						fill="rgba(248,250,252,0.95)"
						font-family="ui-sans-serif, system-ui, sans-serif"
					>
						Your location
					</text>
				{/if}

				{#if currentPoint}
					{@const nowMarker = projectPoint(currentPoint.lat, currentPoint.lon)}
					<circle cx={nowMarker.x} cy={nowMarker.y} r="20" fill={glow} />
					<circle cx={nowMarker.x} cy={nowMarker.y} r="7" fill={accent} />
					<circle cx={nowMarker.x} cy={nowMarker.y} r="2.8" fill="#020617" />
					<text
						x={Math.min(nowMarker.x + 16, width - 60)}
						y={Math.max(nowMarker.y - 18, 24)}
						font-size="15"
						fill="#fff"
						font-family="ui-sans-serif, system-ui, sans-serif"
					>
						Now
					</text>
				{/if}
			</svg>
		</div>

		<div class="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
			<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
				<div class="flex items-center gap-2 text-white">
					<TimerReset size={16} />
					<span class="font-semibold">What you are seeing</span>
				</div>
				<p class="mt-2 leading-relaxed">
					The bright arc is the satellite's next path over Earth's surface. The last point is where
					it is right now.
				</p>
			</div>

			<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
				<div class="flex items-center gap-2 text-white">
					<MapPinned size={16} />
					<span class="font-semibold">Why the location dot matters</span>
				</div>
				<p class="mt-2 leading-relaxed">
					Your dot lets you compare the ground track with your own position so it is easier to judge
					when an overflight will feel close.
				</p>
			</div>

			<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
				<div class="text-[0.68rem] tracking-[0.22em] text-slate-400 uppercase">Catalog object</div>
				<div class="mt-2 font-semibold text-white">
					{snapshot ? snapshot.catalogName : 'Waiting for selection'}
				</div>
				<p class="mt-1 text-sm leading-relaxed text-slate-300">
					{snapshot
						? snapshot.satellite.description
						: 'Choose a satellite card below to load its track and upcoming passes.'}
				</p>
			</div>

			<div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
				<div class="text-[0.68rem] tracking-[0.22em] text-slate-400 uppercase">Pass focus</div>
				<div class="mt-2 font-semibold text-white">
					{nextPass
						? `${Math.round(nextPass.maxElevationDeg)}° high for ${Math.round(nextPass.durationMinutes)} min`
						: 'No pass highlighted'}
				</div>
				<p class="mt-1 text-sm leading-relaxed text-slate-300">
					{nextPass
						? `${nextPass.nightWindow ? 'Night-time geometry gives you the best chance to spot it.' : 'This pass happens in daylight, so it is better for timing than for naked-eye viewing.'}`
						: 'Select a satellite with pass data to see when it becomes easiest to spot.'}
				</p>
			</div>
		</div>
	</div>
</article>
