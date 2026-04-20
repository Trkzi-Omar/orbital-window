<script lang="ts">
	import type { Snippet } from 'svelte';

	type HeroMetric = {
		label: string;
		value: string;
	};

	let {
		eyebrow = 'Orbital Window',
		title,
		lede,
		supportingCopy = [],
		metrics = [],
		children
	} = $props<{
		eyebrow?: string;
		title: string;
		lede: string;
		supportingCopy?: string[];
		metrics?: HeroMetric[];
		children?: Snippet;
	}>();
</script>

<section class="orbital-shell">
	<div class="orbital-panel px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
		<div class="orbital-ring-field orbital-stars pointer-events-none absolute inset-0"></div>

		<div class="relative grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_380px] lg:items-stretch">
			<div class="space-y-6">
				<span class="orbital-kicker">{eyebrow}</span>

				<div class="space-y-4">
					<h1
						class="max-w-4xl text-4xl leading-none font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl"
					>
						{title}
					</h1>
					<p class="max-w-2xl text-lg leading-8 text-white/86 sm:text-xl">
						{lede}
					</p>
				</div>

				{#if supportingCopy.length}
					<div class="grid gap-3 sm:grid-cols-2">
						{#each supportingCopy as copy (copy)}
							<p
								class="rounded-2xl border border-white/8 bg-black/12 px-4 py-4 text-sm leading-6 text-[color:var(--orbital-copy-muted)]"
							>
								{copy}
							</p>
						{/each}
					</div>
				{/if}

				{#if children}
					<div class="pt-1">
						{@render children()}
					</div>
				{/if}
			</div>

			<div class="orbital-lens min-h-[22rem] overflow-hidden p-5 sm:p-6">
				<div class="orbital-ring-field pointer-events-none absolute inset-0 opacity-90"></div>

				<div class="relative flex h-full flex-col justify-between gap-8">
					<div class="space-y-4">
						<div class="flex items-center justify-between gap-4">
							<p
								class="text-xs font-semibold tracking-[0.28em] text-[color:var(--orbital-copy-muted)] uppercase"
							>
								Sky state
							</p>
							<div
								class="inline-flex items-center gap-2 rounded-full border border-[color:var(--orbital-line-strong)] bg-black/25 px-3 py-1 text-xs text-white/72"
							>
								<span
									class="h-2 w-2 rounded-full bg-[color:var(--orbital-accent)] shadow-[0_0_14px_rgba(143,240,255,0.75)]"
								></span>
								Tracking live inputs
							</div>
						</div>

						<div class="rounded-[1.35rem] border border-white/8 bg-black/18 p-5">
							<p class="text-sm tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase">
								Observation stack
							</p>
							<p class="mt-3 max-w-sm text-sm leading-6 text-white/80">
								One place for passes, cloud cover, saved launch points, and the next clean window to
								step outside.
							</p>
						</div>
					</div>

					<div class="space-y-3">
						<div class="orbital-divider"></div>
						<div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
							{#each metrics as metric (metric.label)}
								<div class="rounded-2xl border border-white/8 bg-black/16 px-4 py-4">
									<p
										class="text-[0.68rem] tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
									>
										{metric.label}
									</p>
									<p class="mt-2 text-lg font-medium text-white">
										{metric.value}
									</p>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
