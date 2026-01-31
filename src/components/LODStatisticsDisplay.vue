<!--
  LODStatisticsDisplay Component
  Vue.js 3.0 component for displaying LOD system statistics

  Migrated from React (LODStatistics.tsx) to Vue.js SFC as part of Phase 10 (TASK 62)

  ISSUE 17: LOD-система для дальних кубиков
-->
<script setup lang="ts">
import type { LODStatistics } from '../types/lod'

/**
 * Props for the LODStatisticsDisplay component
 */
defineProps<{
  /** LOD statistics data to display */
  stats: LODStatistics
}>()
</script>

<template>
  <div
    :style="{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontFamily: 'monospace',
      fontSize: '12px',
    }"
  >
    <div>Total Cubes: {{ stats.totalCubes }}</div>
    <div>Avg LOD Level: {{ stats.averageLODLevel.toFixed(2) }}</div>
    <div>Performance Savings: {{ stats.performanceSavings.toFixed(1) }}%</div>
    <div :style="{ marginTop: '5px' }">
      <div v-for="(count, level) in stats.cubesPerLevel" :key="level">
        LOD {{ level }}: {{ count }} cubes
      </div>
    </div>
    <div v-if="stats.transitioningCubes > 0" :style="{ marginTop: '5px' }">
      Transitioning: {{ stats.transitioningCubes }}
    </div>
  </div>
</template>
