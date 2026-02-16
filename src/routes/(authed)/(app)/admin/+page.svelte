<script lang="ts">
  const { data } = $props()
</script>

<svelte:head>
  <title>Administração</title>
</svelte:head>

<section>
  <h1 class="text-2xl font-bold">Administração</h1>
  <div class="grid grid-cols-4 gap-5 my-10 w-full">
    <div class="card card-border">
      <div class="card-body">
        <h2 class="card-title">Total de Usuários</h2>
        <p>{data.stats.totalUsers}</p>
      </div>
    </div>
    <div class="card card-border">
      <div class="card-body">
        <h2 class="card-title">Total de Workspaces</h2>
        <p>{data.stats.totalWorkspaces}</p>
      </div>
    </div>
  </div>
  <div style="margin-bottom: 2rem;">
    <h2>Usuários Recentes</h2>
    <table class="table table-zebra w-full">
      <thead>
        <tr>
          <th>Email</th>
          <th>Username</th>
          <th>Criado em</th>
        </tr>
      </thead>
      <tbody>
        {#each data.stats.recentUsers as user (user.id)}
          <tr>
            <td>{user.email}</td>
            <td>{user.username}</td>
            <td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(user.createdAt))}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
