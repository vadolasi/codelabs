<script lang="ts" generics="T">
import { writable } from "svelte/store"
import {
	createSvelteTable,
	flexRender,
	getCoreRowModel
} from "@tanstack/svelte-table"
import type { ColumnDef, TableOptions } from "@tanstack/svelte-table"

export let columns: ColumnDef<T, string>[]
export let data: T[]

const options = writable<TableOptions<T>>({
	data,
	columns,
	getCoreRowModel: getCoreRowModel()
})

const table = createSvelteTable(options)
</script>

<div class="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
  <table class="table table-lg">
    <thead>
      {#each $table.getHeaderGroups() as headerGroup}
        <tr>
          {#each headerGroup.headers as header}
            <th>
              {#if !header.isPlaceholder}
                <svelte:component
                  this={flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                />
              {/if}
            </th>
          {/each}
        </tr>
      {/each}
    </thead>
    <tbody>
      {#each $table.getRowModel().rows as row}
        <tr>
          {#each row.getVisibleCells() as cell}
            <td>
              <svelte:component
                this={flexRender(cell.column.columnDef.cell, cell.getContext())}
              />
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
    {#if $table.getFooterGroups().length > 1}
      <tfoot>
        {#each $table.getFooterGroups() as footerGroup}
          <tr>
            {#each footerGroup.headers as header}
              <th>
                {#if !header.isPlaceholder}
                  <svelte:component
                    this={flexRender(
                      header.column.columnDef.footer,
                      header.getContext()
                    )}
                  />
                {/if}
              </th>
            {/each}
          </tr>
        {/each}
      </tfoot>
    {/if}
  </table>
</div>
