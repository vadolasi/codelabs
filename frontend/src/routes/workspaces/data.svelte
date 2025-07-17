<script lang="ts">
import { formatDate } from "$lib/date"
import type httpClient from "$lib/httpClient"
import {
	type ColumnDef,
	createColumnHelper,
	renderComponent
} from "@tanstack/svelte-table"
import Table from "../../components/Table.svelte"
import Actions from "./actions.svelte"

type Data = Exclude<
	Awaited<ReturnType<typeof httpClient.workspaces.get>>["data"],
	undefined | null
>

const { data }: { data: Data } = $props()

const columnHelper = createColumnHelper<Data[0]>()

const columns: ColumnDef<Data[0], string>[] = [
	columnHelper.accessor("name", {
		header: "Nome",
		cell: (info) => info.renderValue()
	}),
	columnHelper.accessor((row) => formatDate(row.createdAt), {
		id: "createdAt",
		header: "Criado em",
		cell: (info) => info.renderValue()
	}),
	columnHelper.display({
		id: "actions",
		header: "",
		cell: (info) => renderComponent(Actions, info)
	})
]
</script>

<Table data={data} columns={columns} />
