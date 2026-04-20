<script lang="ts">
	import type { SavedLocationRecord } from '$lib/types/orbital';

	let {
		query = '',
		selectedLocationId = '',
		savedLocations = [],
		busy = false,
		action = '',
		queryFieldName = 'query',
		savedFieldName = 'saved',
		submitLabel = 'Scan sky window'
	} = $props<{
		query?: string;
		selectedLocationId?: string;
		savedLocations?: SavedLocationRecord[];
		busy?: boolean;
		action?: string;
		queryFieldName?: string;
		savedFieldName?: string;
		submitLabel?: string;
	}>();

	let draftQuery = $state('');
	let draftSavedLocationId = $state('');

	$effect(() => {
		draftQuery = query;
	});

	$effect(() => {
		draftSavedLocationId = selectedLocationId;
	});

	function handleQueryInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		draftQuery = target.value;

		if (target.value.trim()) {
			draftSavedLocationId = '';
		}
	}

	function handleSavedChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement;
		draftSavedLocationId = target.value;

		if (target.value) {
			draftQuery = '';
		}
	}
</script>

<form
	method="GET"
	{action}
	class="rounded-[1.6rem] border border-[color:var(--orbital-line)] bg-[linear-gradient(180deg,rgba(8,13,30,0.84),rgba(5,9,22,0.96))] p-4 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.85)]"
>
	<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
		<div
			class={savedLocations.length ? 'grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]' : 'grid gap-3'}
		>
			<label class="space-y-2">
				<span
					class="text-xs font-semibold tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
				>
					Location lookup
				</span>
				<input
					name={queryFieldName}
					type="search"
					value={draftQuery}
					placeholder="City, coordinates, or observing site"
					class="w-full rounded-2xl border border-[color:var(--orbital-line)] bg-black/25 px-4 py-3 text-base text-white transition outline-none focus:border-[color:var(--orbital-accent)] focus:ring-2 focus:ring-[color:var(--orbital-accent)]/30"
					oninput={handleQueryInput}
				/>
			</label>

			{#if savedLocations.length}
				<label class="space-y-2">
					<span
						class="text-xs font-semibold tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
					>
						Saved sites
					</span>
					<select
						name={savedFieldName}
						value={draftSavedLocationId}
						class="w-full rounded-2xl border border-[color:var(--orbital-line)] bg-black/25 px-4 py-3 text-base text-white transition outline-none focus:border-[color:var(--orbital-accent)] focus:ring-2 focus:ring-[color:var(--orbital-accent)]/30"
						onchange={handleSavedChange}
					>
						<option value="">Use a saved launch point</option>
						{#each savedLocations as location (location.id)}
							<option value={location.id}>
								{location.name}{location.country ? ` - ${location.country}` : ''}
							</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>

		<div class="flex flex-col justify-end gap-3">
			<button
				type="submit"
				class="inline-flex h-[3.25rem] items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--orbital-signal),var(--orbital-accent))] px-5 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase transition hover:scale-[1.01] hover:shadow-[0_0_28px_rgba(143,240,255,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
				disabled={busy}
			>
				{busy ? 'Scanning orbit...' : submitLabel}
			</button>
		</div>
	</div>

	<div
		class="mt-4 flex flex-wrap items-center gap-2 text-xs tracking-[0.14em] text-[color:var(--orbital-copy-muted)]"
	>
		<span class="rounded-full border border-white/8 bg-black/15 px-3 py-1.5 uppercase"
			>Cloud cover aware</span
		>
		<span class="rounded-full border border-white/8 bg-black/15 px-3 py-1.5 uppercase"
			>Saved observing sites</span
		>
		<span class="rounded-full border border-white/8 bg-black/15 px-3 py-1.5 uppercase"
			>Pass forecast ready</span
		>
	</div>
</form>
