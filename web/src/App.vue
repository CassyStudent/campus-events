<script setup>
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <header class="site-header">
    <RouterLink to="/" class="brand">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      Campus Events
    </RouterLink>
    <nav aria-label="Main navigation">
      <RouterLink to="/">Events</RouterLink>
      <RouterLink to="/stats">Occupancy</RouterLink>
      <RouterLink to="/events/new" class="button button--small">New event</RouterLink>
    </nav>
  </header>
  <main class="page">
    <RouterView />
  </main>
</template>
