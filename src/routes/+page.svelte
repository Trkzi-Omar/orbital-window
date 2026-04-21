<script lang="ts">
	import EmptyState from '$lib/components/empty-state.svelte';
	import HeroPanel from '$lib/components/hero-panel.svelte';
	import LocationForm from '$lib/components/location-form.svelte';
	import ObservationSummary from '$lib/components/observation-summary.svelte';
	import OrbitMap from '$lib/components/orbit-map.svelte';
	import PassCard from '$lib/components/pass-card.svelte';
	import SatelliteStrip from '$lib/components/satellite-strip.svelte';
	import SectionLabel from '$lib/components/section-label.svelte';
	import type {
		DashboardPayload,
		SatelliteSnapshot,
		SavedLocationRecord,
		WeatherPoint,
		WeatherSummary
	} from '$lib/types/orbital';

	type SearchState = {
		query?: string;
		savedLocationId?: string | null;
		pending?: boolean;
		error?: string | null;
	};

	type PageShellData = {
		dashboard?: DashboardPayload | null;
		savedLocations?: SavedLocationRecord[];
		search?: SearchState;
		form?: SearchState;
	};

	let { data } = $props<{ data?: PageShellData }>();

	const dashboard = $derived(data?.dashboard ?? null);
	const savedLocations = $derived(data?.savedLocations ?? dashboard?.savedLocations ?? []);
	const searchState = $derived(data?.form ?? data?.search ?? {});
	const activeLocation = $derived(dashboard?.location ?? null);
	const snapshots = $derived((dashboard?.snapshots ?? []) as SatelliteSnapshot[]);
	const weather = $derived(dashboard?.weather ?? null);
	const activeTimezone = $derived(weather?.timezone ?? activeLocation?.timezone ?? 'UTC');
	const savedSelectionValue = $derived(searchState.savedLocationId ?? '');
	const totalUpcomingPasses = $derived(
		snapshots.reduce((total, snapshot) => total + snapshot.nextPasses.length, 0)
	);
	const pinnedLocationCount = $derived(
		savedLocations.filter((location: SavedLocationRecord) => location.isPinned).length
	);
	const bestCloudWindow = $derived(getBestCloudWindow(weather));
	const nextSunWindow = $derived(weather?.sunWindows[0] ?? null);

	let selectedSatelliteId = $state<string | null>(null);

	$effect(() => {
		const firstAvailable = snapshots[0]?.satellite.id ?? null;
		if (!firstAvailable) {
			selectedSatelliteId = null;
			return;
		}

		if (
			!selectedSatelliteId ||
			!snapshots.some((snapshot) => snapshot.satellite.id === selectedSatelliteId)
		) {
			selectedSatelliteId = firstAvailable;
		}
	});

	const selectedSnapshot = $derived(
		snapshots.find((snapshot) => snapshot.satellite.id === selectedSatelliteId) ??
			snapshots[0] ??
			null
	);
	const featuredPass = $derived(selectedSnapshot?.nextPasses[0] ?? null);

	const heroMetrics = $derived([
		{
			label: 'Observation site',
			value: activeLocation?.name ?? 'Search for a site'
		},
		{
			label: 'Useful passes',
			value: totalUpcomingPasses
				? `${totalUpcomingPasses} in the next day`
				: 'Awaiting a viable window'
		},
		{
			label: 'Saved presets',
			value: savedLocations.length
				? `${savedLocations.length} saved${pinnedLocationCount ? ` · ${pinnedLocationCount} pinned` : ''}`
				: 'Build your shortlist'
		}
	]);

	function formatTimestamp(value: string | null | undefined, timezone = activeTimezone) {
		if (!value) {
			return 'Awaiting ephemeris sync';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: timezone ?? 'UTC'
		}).format(new Date(value));
	}

	function formatClock(value: string | null | undefined, timezone = activeTimezone) {
		if (!value) {
			return 'Pending';
		}

		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: timezone ?? 'UTC'
		}).format(new Date(value));
	}

	function formatDay(value: string | null | undefined, timezone = activeTimezone) {
		if (!value) {
			return 'Forecast day';
		}

		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: timezone ?? 'UTC'
		}).format(new Date(value));
	}

	function formatCoordinates(location: DashboardPayload['location']) {
		if (!location) {
			return 'Search a city or pick a saved observing site to anchor the board.';
		}

		return `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}${location.country ? ` · ${location.country}` : ''}`;
	}

	function describeWeather(weatherSummary: WeatherSummary | null) {
		if (!weatherSummary?.hourlyCloudCover.length) {
			return 'Cloud forecast fills in once Open-Meteo responds.';
		}

		const lowestCloud = Math.min(
			...weatherSummary.hourlyCloudCover.map((point) => point.cloudCover)
		);
		const clearestWindow = getBestCloudWindow(weatherSummary);

		if (!clearestWindow) {
			return `Lowest projected cloud cover in the next samples: ${lowestCloud}%.`;
		}

		return `${lowestCloud}% cloud around ${formatClock(clearestWindow.time, weatherSummary.timezone)}.`;
	}

	function getBestCloudWindow(weatherSummary: WeatherSummary | null): WeatherPoint | null {
		if (!weatherSummary?.hourlyCloudCover.length) {
			return null;
		}

		return weatherSummary.hourlyCloudCover.reduce(
			(best, point) => {
				if (!best) {
					return point;
				}

				return point.cloudCover < best.cloudCover ? point : best;
			},
			null as WeatherPoint | null
		);
	}
</script>

<svelte:head>
	<title>Orbital Window</title>
	<meta
		name="description"
		content="Orbital Window helps you pick a real place on Earth, compare upcoming satellite passes, and decide when it is actually worth stepping outside."
	/>
</svelte:head>

<div class="orbital-page">
	<div class="orbital-shell mb-5 sm:mb-7">
		<div class="orbital-brandbar">
			<div class="orbital-brandmark">
				<span class="orbital-brandmark-code">OW</span>
				<div>
					<p class="orbital-brandmark-title">Orbital Window</p>
					<p class="orbital-brandmark-copy">Public observation computer</p>
				</div>
			</div>

			<div class="orbital-brandmeta">
				<span class="orbital-data-pill">Ground track guided</span>
				<span class="orbital-data-pill">Cloud-aware passes</span>
				<span class="orbital-data-pill">Civilian sky log</span>
			</div>
		</div>
	</div>

	<HeroPanel
		eyebrow="Observation console"
		title="Find the next satellite pass that is actually worth looking up for."
		lede="Orbital Window turns orbital data into a practical stargazing board: where to stand, which object to watch, and whether the sky will cooperate."
		supportingCopy={[
			'Search any city, coastline, rooftop, or observing site and Orbital Window builds a live board around that point on Earth.',
			'Compare a curated set of recognizable satellites, then use pass scores, cloud cover, and ground tracks to decide if tonight is the night.'
		]}
		metrics={heroMetrics}
	>
		<div class="space-y-4">
			<LocationForm
				query={searchState.query ?? activeLocation?.query ?? ''}
				selectedLocationId={savedSelectionValue}
				{savedLocations}
				busy={searchState.pending ?? false}
				submitLabel="Build observation board"
			/>

			{#if searchState.error}
				<div
					class="rounded-[1.3rem] border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-7 text-amber-100"
				>
					{searchState.error}
				</div>
			{/if}
		</div>
	</HeroPanel>

	<section class="orbital-shell mt-12 space-y-8 sm:mt-16" id="dashboard">
		<SectionLabel
			eyebrow="Observation board"
			title="A location-first dashboard for satellite spotting"
			subtitle="This MVP favors practical answers over raw telemetry: useful passes first, orbit context second, and weather friction always visible."
		/>

		<div class="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_360px] lg:items-start">
			<div class="space-y-6">
				<div class="orbital-panel p-5 sm:p-6 lg:p-7">
					<div class="relative space-y-6">
						<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
							<div class="space-y-3">
								<p
									class="text-xs font-semibold tracking-[0.28em] text-[color:var(--orbital-copy-muted)] uppercase"
								>
									Current board
								</p>
								<div>
									<h2 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
										{activeLocation ? `Tracking ${activeLocation.name}` : 'Start with a location'}
									</h2>
									<p class="orbital-copy mt-2 max-w-3xl text-sm leading-7 sm:text-base">
										{formatCoordinates(activeLocation)}
									</p>
								</div>
							</div>

							<div class="flex flex-wrap items-center gap-3">
								<div
									class="rounded-full border border-[color:var(--orbital-line)] bg-black/20 px-4 py-2 text-xs tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
								>
									{activeTimezone}
								</div>
								<div
									class="rounded-full border border-[color:var(--orbital-line)] bg-black/20 px-4 py-2 text-xs tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
								>
									{formatTimestamp(dashboard?.lastUpdated ?? null)}
								</div>
							</div>
						</div>

						{#if activeLocation}
							{#if snapshots.length}
								<SatelliteStrip
									{snapshots}
									{selectedSatelliteId}
									on:select={({ detail }) => {
										selectedSatelliteId = detail.satelliteId;
									}}
								/>

								<div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px] xl:items-start">
									<OrbitMap
										snapshot={selectedSnapshot}
										location={activeLocation}
										highlightedPass={featuredPass}
										timezone={activeTimezone}
									/>

									<div class="space-y-4">
										<article class="rounded-[1.5rem] border border-white/10 bg-white/4 p-5">
											<p
												class="text-[0.68rem] font-semibold tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
											>
												Best next step
											</p>
											<h3 class="mt-3 text-2xl font-semibold tracking-tight text-white">
												{featuredPass
													? `${selectedSnapshot?.satellite.name} peaks at ${formatClock(featuredPass.peakTime)}`
													: 'No strong pass in the current window'}
											</h3>
											<p class="orbital-copy mt-3 text-sm leading-7">
												{featuredPass
													? `Plan to be outside a few minutes before ${formatClock(featuredPass.startTime)}. The pass tops out at ${Math.round(featuredPass.maxElevationDeg)}° and currently scores ${Math.round(featuredPass.visibilityScore)}/100 for visibility.`
													: 'Try another satellite or another observing site. Orbital Window only surfaces passes that come high enough above the horizon to matter.'}
											</p>
										</article>

										<article class="rounded-[1.5rem] border border-white/10 bg-white/4 p-5">
											<p
												class="text-[0.68rem] font-semibold tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
											>
												Sky conditions
											</p>
											<h3 class="mt-3 text-xl font-semibold text-white">
												{bestCloudWindow
													? `${bestCloudWindow.cloudCover}% cloud near ${formatClock(bestCloudWindow.time)}`
													: 'Cloud forecast pending'}
											</h3>
											<p class="orbital-copy mt-2 text-sm leading-7">
												{describeWeather(weather)}
											</p>
											{#if nextSunWindow}
												<div
													class="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80"
												>
													<div class="font-medium text-white">
														{formatDay(nextSunWindow.sunrise)}
													</div>
													<div class="mt-2 flex flex-wrap gap-3">
														<span>Sunrise {formatClock(nextSunWindow.sunrise)}</span>
														<span>Sunset {formatClock(nextSunWindow.sunset)}</span>
													</div>
												</div>
											{/if}
										</article>

										<article class="rounded-[1.5rem] border border-white/10 bg-white/4 p-5">
											<p
												class="text-[0.68rem] font-semibold tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
											>
												Selected object
											</p>
											<h3 class="mt-3 text-xl font-semibold text-white">
												{selectedSnapshot?.satellite.name ?? 'Choose a satellite'}
											</h3>
											<p class="orbital-copy mt-2 text-sm leading-7">
												{selectedSnapshot?.satellite.description ??
													'The curated list is built for a layperson: recognizable missions, cleaner stories, and fewer anonymous catalog numbers.'}
											</p>
											{#if selectedSnapshot}
												<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
													<div class="rounded-2xl border border-white/10 bg-black/20 p-4">
														<div
															class="text-[0.68rem] tracking-[0.22em] text-[color:var(--orbital-copy-muted)] uppercase"
														>
															Current altitude
														</div>
														<div class="mt-2 text-lg font-semibold text-white">
															{selectedSnapshot.currentAltitudeKm !== null
																? `${Math.round(selectedSnapshot.currentAltitudeKm)} km`
																: 'Pending'}
														</div>
													</div>
													<div class="rounded-2xl border border-white/10 bg-black/20 p-4">
														<div
															class="text-[0.68rem] tracking-[0.22em] text-[color:var(--orbital-copy-muted)] uppercase"
														>
															Passes surfaced
														</div>
														<div class="mt-2 text-lg font-semibold text-white">
															{selectedSnapshot.nextPasses.length
																? `${selectedSnapshot.nextPasses.length} upcoming`
																: 'None in range'}
														</div>
													</div>
												</div>
											{/if}
										</article>
									</div>
								</div>

								<div class="space-y-4">
									<div class="flex items-end justify-between gap-4">
										<div>
											<p
												class="text-xs font-semibold tracking-[0.28em] text-[color:var(--orbital-copy-muted)] uppercase"
											>
												Upcoming passes
											</p>
											<h3 class="mt-2 text-2xl font-semibold tracking-tight text-white">
												{selectedSnapshot?.satellite.name
													? `${selectedSnapshot.satellite.name} over ${activeLocation.name}`
													: 'Upcoming windows'}
											</h3>
										</div>
										<p
											class="max-w-sm text-right text-sm leading-7 text-[color:var(--orbital-copy-muted)]"
										>
											Pass cards translate orbital geometry into a human decision: when to step
											outside and which direction to face.
										</p>
									</div>

									{#if selectedSnapshot?.nextPasses.length}
										<div class="grid gap-4 xl:grid-cols-2">
											{#each selectedSnapshot.nextPasses as pass, index (pass.id)}
												<PassCard
													{pass}
													satellite={selectedSnapshot.satellite}
													timezone={activeTimezone}
													emphasize={index === 0}
												/>
											{/each}
										</div>
									{:else}
										<EmptyState
											variant="passes"
											location={activeLocation}
											satellite={selectedSnapshot?.satellite ?? null}
										/>
									{/if}
								</div>
							{:else}
								<EmptyState variant="passes" location={activeLocation} />
							{/if}
						{:else}
							<EmptyState variant="location" />
						{/if}
					</div>
				</div>
			</div>

			<aside class="space-y-6">
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
					<ObservationSummary
						label="Site status"
						value={activeLocation?.name ?? 'No observing site'}
						detail={activeLocation
							? formatCoordinates(activeLocation)
							: 'Use the search form to anchor the board to a real place.'}
						tone="accent"
					/>
					<ObservationSummary
						label="Best next pass"
						value={featuredPass ? formatClock(featuredPass.peakTime) : 'No viable pass'}
						detail={featuredPass
							? `${Math.round(featuredPass.visibilityScore)}/100 visibility score for ${selectedSnapshot?.satellite.name}.`
							: 'Switch satellites or search another location to compare pass quality.'}
						tone="signal"
					/>
					<ObservationSummary
						label="Saved locations"
						value={savedLocations.length ? `${savedLocations.length} on file` : 'Build your stack'}
						detail={savedLocations.length
							? `${pinnedLocationCount} pinned for instant reuse.`
							: 'Searching a location stores it locally so you can jump back to it later.'}
					/>
					<ObservationSummary
						label="Weather cue"
						value={bestCloudWindow ? `${bestCloudWindow.cloudCover}% cloud` : 'Pending'}
						detail={bestCloudWindow
							? `Clearest sampled hour: ${formatClock(bestCloudWindow.time)}.`
							: 'The cloud cover lane updates when weather data is available.'}
					/>
				</div>

				<div class="orbital-panel p-5 sm:p-6">
					<div class="space-y-4">
						<div class="space-y-2">
							<p
								class="text-xs font-semibold tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
							>
								Saved launch points
							</p>
							<h3 class="text-xl font-semibold text-white">Fast return sites</h3>
							<p class="orbital-copy text-sm leading-7">
								Keep rooftops, coastlines, and dark-sky spots close so the next orbit check stays a
								one-click decision.
							</p>
						</div>

						{#if savedLocations.length}
							<ul class="space-y-3">
								{#each savedLocations as location (location.id)}
									{@const isActive = location.id === savedSelectionValue}
									<li
										class={`rounded-2xl border px-4 py-4 ${
											isActive
												? 'border-[color:var(--orbital-line-strong)] bg-[rgba(143,240,255,0.08)]'
												: 'border-white/8 bg-black/18'
										}`}
									>
										<div class="flex items-start justify-between gap-4">
											<div>
												<p class="text-base font-medium text-white">{location.name}</p>
												<p class="orbital-copy mt-1 text-sm leading-6">{location.displayName}</p>
											</div>
											{#if location.isPinned}
												<span
													class="rounded-full border border-[color:var(--orbital-line-strong)] bg-black/30 px-3 py-1 text-[0.65rem] tracking-[0.22em] text-[color:var(--orbital-accent)] uppercase"
												>
													Pinned
												</span>
											{/if}
										</div>

										<div class="mt-4 flex flex-wrap gap-2">
											<form method="GET">
												<input type="hidden" name="saved" value={location.id} />
												<button
													type="submit"
													class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-white uppercase transition hover:border-white/22"
												>
													Load board
												</button>
											</form>

											<form method="POST" action="?/togglePin">
												<input type="hidden" name="locationId" value={location.id} />
												<input
													type="hidden"
													name="returnQuery"
													value={searchState.query ?? activeLocation?.query ?? ''}
												/>
												<input type="hidden" name="returnSaved" value={savedSelectionValue} />
												<button
													type="submit"
													class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-white uppercase transition hover:border-white/22"
												>
													{location.isPinned ? 'Unpin' : 'Pin'}
												</button>
											</form>

											<form method="POST" action="?/deleteLocation">
												<input type="hidden" name="locationId" value={location.id} />
												<input
													type="hidden"
													name="returnQuery"
													value={searchState.query ?? activeLocation?.query ?? ''}
												/>
												<input type="hidden" name="returnSaved" value={savedSelectionValue} />
												<button
													type="submit"
													class="rounded-full border border-rose-300/20 bg-rose-300/8 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-rose-100 uppercase transition hover:border-rose-300/32"
												>
													Remove
												</button>
											</form>
										</div>
									</li>
								{/each}
							</ul>
						{:else}
							<div class="orbital-empty-state rounded-[1.45rem] p-5">
								<p class="text-sm font-medium text-white">No saved locations yet.</p>
								<p class="orbital-copy mt-2 text-sm leading-7">
									Every successful search is cached locally so the board can double as your personal
									shortlist of observation spots.
								</p>
							</div>
						{/if}
					</div>
				</div>
			</aside>
		</div>
	</section>

	<footer class="orbital-shell mt-12 sm:mt-16">
		<div class="orbital-footer">
			<div class="space-y-3">
				<p class="orbital-footer-label">Orbital Window brand note</p>
				<h2 class="orbital-footer-title">A satellite board designed like field equipment, not a generic telemetry toy.</h2>
				<p class="orbital-copy max-w-3xl text-sm leading-7 sm:text-base">
					Orbital Window is its own brand: observatory-like, civilian, and practical. The interface is meant
					to feel like a trusted night-sky instrument for people who want to step outside with intent.
				</p>
			</div>

			<a
				class="orbital-footer-link"
				href="https://omartrkzi.com"
				target="_blank"
				rel="noreferrer"
			>
				Visit omartrkzi.com
			</a>
		</div>
	</footer>
</div>
