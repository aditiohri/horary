<script setup lang="ts">
import UserChat from "./components/UserChat.vue";
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Horary Astrology</h1>
    </header>

    <main class="app-main">
      <UserChat />
    </main>
  </div>
</template>

<style>
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  line-height: 1.6;
  color: #2c3e50;
  background-color: #f7fafc;
  overflow-x: hidden; /* Prevent horizontal scroll */
}

/* App container */
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden; /* Prevent horizontal scroll */
}

/* Header */
.app-header {
  background-color: white;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100%;
}

.app-header h1 {
  font-size: 1.5rem;
  color: #2c3e50;
}

/* Main content */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 1rem;
  gap: 1rem;
  overflow-x: hidden; /* Prevent horizontal scroll */
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .app-header {
    padding: 0.75rem;
  }

  .app-header h1 {
    font-size: 1.25rem;
  }

  .app-main {
    padding: 0.5rem;
  }
}
</style>
