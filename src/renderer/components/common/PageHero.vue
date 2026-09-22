<template>
  <header class="page-hero" :class="compact ? 'page-hero--compact' : ''">
    <img v-if="image" :src="image" alt="" aria-hidden="true" class="page-hero__image" :class="imageClass" />
    <div class="page-hero__glow"></div>
    <div class="page-hero__content">
      <div class="page-hero__title-row">
        <span class="page-hero__icon"><i :class="icon"></i></span>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h1 class="page-hero__title">{{ title }}</h1>
            <span v-if="count != null" class="page-hero__count">共 {{ count }} 个</span>
          </div>
          <p v-if="description" class="page-hero__description">{{ description }}</p>
        </div>
      </div>
      <div v-if="$slots.actions" class="page-hero__actions">
        <slot name="actions"></slot>
      </div>
      <div v-if="$slots.tabs" class="page-hero__tabs">
        <slot name="tabs"></slot>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: 'fa-solid fa-cubes' },
  count: { type: [Number, String], default: null },
  image: { type: String, default: '' },
  imageClass: { type: String, default: '' },
  compact: { type: Boolean, default: false },
});
</script>

<style scoped>
.page-hero {
  position: relative;
  overflow: hidden;
  min-height: 112px;
  padding: 18px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--card-border);
}
.page-hero--compact { min-height: 88px; padding: 14px 24px; }
.page-hero__content { position: relative; z-index: 1; max-width: 72%; }
.page-hero__title-row { display: flex; align-items: center; gap: 10px; }
.page-hero__icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px;
  color: #fff; background: linear-gradient(135deg, hsl(var(--primary)), color-mix(in srgb, hsl(var(--primary)) 58%, white));
  box-shadow: 0 5px 12px hsl(var(--primary) / 22%);
}
.page-hero__title { margin: 0; color: hsl(var(--foreground)); font-size: 18px; line-height: 1.25; font-weight: 700; }
.page-hero__count { flex-shrink: 0; color: hsl(var(--muted-foreground)); font-size: 12px; }
.page-hero__description { margin: 5px 0 0; color: hsl(var(--muted-foreground)); font-size: 12px; line-height: 1.5; }
.page-hero__count + .page-hero__description { margin-top: 4px; }
.page-hero__actions { position: absolute; top: 18px; right: 24px; z-index: 2; display: flex; align-items: center; gap: 8px; }
.page-hero__tabs { position: relative; z-index: 2; display: flex; gap: 6px; margin-top: 14px; }
.page-hero__image { position: absolute; z-index: 0; right: -2%; top: 50%; width: min(42%, 520px); transform: translateY(-50%); opacity: .86; pointer-events: none; -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 30%); mask-image: linear-gradient(90deg, transparent 0%, #000 30%); }
.page-hero__image--center { right: 3%; width: min(34%, 420px); }
.page-hero__glow { position: absolute; right: 22%; top: -80px; width: 220px; height: 220px; border-radius: 999px; background: hsl(var(--primary) / 9%); filter: blur(34px); }
@media (max-width: 900px) {
  .page-hero__content { max-width: 100%; }
  .page-hero__image { opacity: .22; width: 65%; }
  .page-hero__actions { right: 16px; }
}
</style>
