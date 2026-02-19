<script lang="ts">
  import { toDom } from 'hast-util-to-dom';
  import rehypeStarryNight from 'rehype-starry-night';
  import rehypeStringify from 'rehype-stringify';
  import remarkGfm from 'remark-gfm';
  import remarkParse from 'remark-parse';
  import remarkRehype from 'remark-rehype';
  import { onMount } from 'svelte';
  import { unified } from 'unified';
  import editorState from '../editorState.svelte';

  let container: HTMLDivElement;
  let content = $derived.by(() => {
    if (!editorState.currentTab) return '';
    const item = editorState.filesMap.get(editorState.currentTab);
    const data = item?.get('data') as any;
    return data?.content || '';
  });

  async function renderMarkdown(text: string) {
    if (!container) return;
    
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStarryNight)
      .use(rehypeStringify)
      .process(text);

    container.innerHTML = String(file);
  }

  $effect(() => {
    renderMarkdown(content);
  });
</script>

<div class="w-full h-full overflow-auto p-8 bg-base-100">
  <div bind:this={container} class="prose prose-slate max-w-none dark:prose-invert"></div>
</div>
