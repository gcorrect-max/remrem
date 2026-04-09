<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 class="font-sans text-base font-semibold text-rail-header">Config — Files</h1>
        <p class="font-mono text-xs text-rail-dim mt-0.5">Log file paths, export settings, data retention</p>
      </div>
      <div class="bg-rail-surface border border-rail-border rounded p-8 flex flex-col items-center justify-center gap-3">
        <span class="text-4xl opacity-30">⚙️</span>
        <p class="font-mono text-sm text-rail-dim text-center">
          Files configuration<br>
          <span class="text-[11px] text-rail-dim/50">Connect to REM102 device to load parameters</span>
        </p>
        <button class="mt-2 px-4 py-2 bg-rail-card border border-rail-border hover:border-rail-accent text-rail-dim hover:text-rail-accent transition-colors rounded font-mono text-xs">
          Load from device
        </button>
      </div>
    </div>
  </div>
</template>
