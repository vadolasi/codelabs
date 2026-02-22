<script>
  import { Mail, Users } from '@lucide/svelte';
  import { page } from '$app/state';
</script>

<div class="drawer lg:drawer-open h-[calc(100vh-4rem)]">
  <input id="admin-drawer" type="checkbox" class="drawer-toggle" />
  
  <div class="drawer-content flex flex-col p-6 overflow-y-auto">
    <!-- Page content here -->
    <slot />
  </div> 
  
  <div class="drawer-side border-r border-base-content/10 z-20">
    <label for="admin-drawer" aria-label="close sidebar" class="drawer-overlay"></label> 
    <ul class="menu p-4 w-60 min-h-full bg-base-100 text-base-content gap-2">
      <!-- Sidebar content here -->
      <li class="menu-title text-xs font-bold uppercase tracking-widest opacity-50 mb-2">Administração</li>
      
      <li>
        <a 
          href="/admin" 
          class:active={page.url.pathname === '/admin'}
          class="flex items-center gap-3 font-medium"
        >
          <Users class="w-4 h-4" />
          Usuários
        </a>
      </li>
      
      <li>
        <a 
          href="/admin/email" 
          class:active={page.url.pathname === '/admin/email'}
          class="flex items-center gap-3 font-medium"
        >
          <Mail class="w-4 h-4" />
          Transmissão de E-mail
        </a>
      </li>
    </ul>
  </div>
</div>
