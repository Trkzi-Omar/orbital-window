<script lang="ts">
	let {
		label,
		value,
		detail = '',
		tone = 'default'
	} = $props<{
		label: string;
		value: string;
		detail?: string;
		tone?: 'default' | 'accent' | 'signal';
	}>();
</script>

<article data-tone={tone} class="orbital-summary rounded-[1.35rem] border p-4 sm:p-5">
	<p
		class="text-[0.68rem] font-semibold tracking-[0.24em] text-[color:var(--orbital-copy-muted)] uppercase"
	>
		{label}
	</p>
	<p class="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
		{value}
	</p>
	{#if detail}
		<p class="mt-2 text-sm leading-6 text-[color:var(--orbital-copy-muted)]">
			{detail}
		</p>
	{/if}
</article>

<style>
	.orbital-summary {
		border-color: rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.18);
	}

	.orbital-summary[data-tone='accent'] {
		border-color: rgba(143, 240, 255, 0.26);
		background: linear-gradient(180deg, rgba(143, 240, 255, 0.12), rgba(7, 14, 33, 0.85));
	}

	.orbital-summary[data-tone='signal'] {
		border-color: rgba(255, 211, 110, 0.26);
		background: linear-gradient(180deg, rgba(255, 211, 110, 0.14), rgba(8, 14, 33, 0.84));
	}
</style>
