<script lang="ts">
import type { ApiData } from "$lib/httpClient"
import {
	createColumnHelper,
	renderComponent,
	type ColumnDef
} from "@tanstack/svelte-table"
import Table from "../../components/Table.svelte"
import Actions from "./actions.svelte"
import { formatDate, formatRelativeTime } from "$lib/date";
import type httpClient from "$lib/httpClient";

type Data = Exclude<Awaited<ReturnType<typeof httpClient.workspaces.get>>["data"], undefined | null>

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
	columnHelper.accessor((row) => formatRelativeTime(row.updatedAt), {
		id: "updatedAt",
		header: "Última atualização",
		cell: (info) => info.renderValue()
	}),
	columnHelper.display({
		id: "actions",
		header: "Ações",
		cell: (info) => renderComponent(Actions, info)
	})
]
</script>

<Table data={data} columns={columns} />
