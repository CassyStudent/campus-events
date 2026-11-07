<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { formatDay, formatMonth, formatTime, isPast } from '../utils/format.js';

const props = defineProps({
  event: { type: Object, required: true }
});

const past = computed(() => isPast(props.event.startsAt));
</script>

<template>
  <RouterLink :to="`/events/${event.id}`" class="ticket" :class="{ 'ticket--past': past }">
    <div class="ticket__stub">
      <span class="ticket__day">{{ formatDay(event.startsAt) }}</span>
      <span class="ticket__month">{{ formatMonth(event.startsAt) }}</span>
    </div>
    <div class="ticket__body">
      <h3 class="ticket__title">{{ event.title }}</h3>
      <p class="ticket__meta">{{ event.location }}, {{ formatTime(event.startsAt) }}</p>
      <p class="ticket__capacity">{{ past ? 'Took place' : `${event.capacity} seats` }}</p>
    </div>
    <span class="ticket__arrow" aria-hidden="true">↗</span>
  </RouterLink>
</template>
