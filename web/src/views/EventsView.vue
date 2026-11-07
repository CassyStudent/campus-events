<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getEvents } from '../api/events.js';
import ErrorMessage from '../components/ErrorMessage.vue';
import EventCard from '../components/EventCard.vue';
import CampusOrbit from '../components/CampusOrbit.vue';
import { isPast } from '../utils/format.js';

const events = ref([]);
const loading = ref(true);
const error = ref(null);

const upcoming = computed(() => events.value.filter((event) => !isPast(event.startsAt)));
const past = computed(() => events.value.filter((event) => isPast(event.startsAt)));

onMounted(async () => {
  try {
    events.value = await getEvents();
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="campus-hero" aria-labelledby="welcome-title">
    <div class="campus-hero__copy">
      <p class="eyebrow"><span class="live-dot" aria-hidden="true"></span> A little more connection</p>
      <h1 id="welcome-title">Your campus.<br /><span>Your kind of plans.</span></h1>
      <p class="campus-hero__description">Meet new people. Try something different.<br />Make a little room for what you love.</p>
      <a href="#upcoming" class="button hero-button">Find your next thing <span aria-hidden="true">↗</span></a>
    </div>
    <CampusOrbit />
  </section>

  <div id="upcoming" class="section-heading">
    <div>
      <p class="eyebrow">Good things, coming up</p>
      <h2 class="section-title">What's on at campus</h2>
    </div>
    <span v-if="!loading && !error" class="count-label">{{ upcoming.length }} upcoming</span>
  </div>

  <p v-if="loading" class="muted">Loading events…</p>
  <ErrorMessage :error="error" />

  <template v-if="!loading && !error">
    <section v-if="upcoming.length" class="ticket-grid" aria-label="Upcoming events">
      <EventCard v-for="event in upcoming" :key="event.id" :event="event" />
    </section>
    <div v-else class="empty">
      <p>No upcoming events yet.</p>
      <RouterLink to="/events/new" class="button">Create the first event</RouterLink>
    </div>

    <template v-if="past.length">
      <div class="section-heading section-heading--past">
        <div><p class="eyebrow">A little look back</p><h2 class="section-title">Earlier on campus</h2></div>
      </div>
      <section class="ticket-grid" aria-label="Past events">
        <EventCard v-for="event in past" :key="event.id" :event="event" />
      </section>
    </template>
  </template>
</template>
