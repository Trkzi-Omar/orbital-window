<script lang="ts">
	let {
		eyebrow = 'Mission lane',
		title,
		subtitle = '',
		align = 'start'
	} = $props<{
		eyebrow?: string;
		title: string;
		subtitle?: string;
		align?: 'start' | 'center';
	}>();
</script>

<div
	class={`flex flex-col gap-3 ${align === 'center' ? 'items-center text-center' : 'items-start text-start'}`}
>
	<span class="orbital-kicker">{eyebrow}</span>
	<div class="max-w-3xl space-y-2">
		<h2 class="text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2.15rem]">
			{title}
		</h2>
		{#if subtitle}
			<p class="orbital-copy text-sm leading-6 sm:text-base sm:leading-7">
				{subtitle}
			</p>
		{/if}
	</div>
</div>
