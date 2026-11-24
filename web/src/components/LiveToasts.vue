<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { watchNotifications } from '../api/events.js';

const messages = ref([]);
const timers = new Map();
let stop;
function dismiss(id) {
  messages.value = messages.value.filter((message) => message.id !== id);
  clearTimeout(timers.get(id));
  timers.delete(id);
}
onMounted(() => {
  stop = watchNotifications((message) => {
    messages.value.push({
      id: message.id,
      text: message.type === 'event.created' ? 'A new campus event was created.' : 'Someone registered for a campus event.'
    });
    timers.set(message.id, setTimeout(() => dismiss(message.id), 7000));
  });
});
onUnmounted(() => {
  stop?.();
  for (const timer of timers.values()) clearTimeout(timer);
});
</script>

<template>
  <aside class="live-toasts" aria-label="Live campus notifications" aria-live="polite" aria-relevant="additions">
    <div v-for="message in messages" :key="message.id" class="live-toast" role="status">
      <span class="live-toast__dot" aria-hidden="true"></span>
      <span>{{ message.text }}</span>
      <button type="button" aria-label="Dismiss notification" @click="dismiss(message.id)">×</button>
    </div>
  </aside>
</template>

<style scoped>
.live-toasts { position: fixed; right: 1rem; bottom: 1rem; z-index: 100; display: grid; gap: .7rem; width: min(25rem, calc(100vw - 2rem)); max-height: 80vh; overflow-y: auto; }
.live-toast { display: flex; align-items: center; gap: .8rem; padding: 1rem; border: 1px solid #ffffff; border-radius: 1.4rem; background: #faf7ff; box-shadow: 0 8px 35px #66528a26; color: #30283d; }
.live-toast__dot { flex-shrink: 0; width: .7rem; height: .7rem; border-radius: 50%; background: #9975e7; }
.live-toast button { margin-left: auto; border: 0; background: transparent; color: inherit; font-size: 1.5rem; cursor: pointer; padding: .3rem; }
</style>
