<template>
  <header class="page-hero" :class="[compact ? 'page-hero--compact' : '', heroClass]">
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
    </div>
    <div v-if="$slots.actions" class="page-hero__actions">
      <slot name="actions"></slot>
    </div>
    <div v-if="$slots.tabs" class="page-hero__tabs">
      <slot name="tabs"></slot>
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
  heroClass: { type: String, default: '' },
  compact: { type: Boolean, default: false },
});
</script>

<style scoped>
.page-hero {
  position: relative;
  overflow: hidden;
  min-height: 112px;
  flex-shrink: 0;
  padding: 18px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--card-border);
}
.page-hero--spec { min-height: 136px; padding: 22px 28px; border: 1px solid var(--card-border); border-radius: 16px; box-shadow: var(--shadow-card-token); }
.page-hero--spec .page-hero__content { max-width: 56%; }
.page-hero--spec .page-hero__image--center { width: min(54%, 700px); height: 122%; opacity: .9; }
.page-hero__content { position: relative; z-index: 1; max-width: 58%; }
.page-hero:has(.page-hero__actions) .page-hero__content { max-width: 45%; }
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
.page-hero__actions { position: absolute; top: 16px; right: 20px; z-index: 2; display: flex; align-items: center; gap: 6px; }
.page-hero__actions :deep(.btn-sm), .page-hero__actions :deep(.btn-sm-pri) {
  height: 28px;
  padding-inline: 9px;
  font-size: 12px;
}
/* Hero 内操作按钮是浮在插图上的：用透明玻璃而非实心蓝块，
   保留轮廓与可读性，不把右侧插图盖成一块突兀色砖 */
.page-hero__actions :deep(.btn-sm),
.page-hero__actions :deep(.btn-sm-pri) {
  color: hsl(var(--primary));
  background: color-mix(in srgb, hsl(var(--background)) 78%, hsl(var(--primary)) 10%);
  border: 1px solid hsl(var(--primary) / 22%);
  box-shadow: 0 4px 14px hsl(var(--primary) / 10%), inset 0 1px 0 hsl(0 0% 100% / 70%);
  backdrop-filter: blur(12px) saturate(1.25);
}
.page-hero__actions :deep(.btn-sm):hover,
.page-hero__actions :deep(.btn-sm-pri):hover {
  color: hsl(var(--primary-dark));
  background: color-mix(in srgb, hsl(var(--background)) 88%, hsl(var(--primary)) 14%);
  border-color: hsl(var(--primary) / 40%);
}

.page-hero__tabs { position: absolute; left: 24px; bottom: 10px; z-index: 2; display: flex; gap: 6px; }
.page-hero__image { position: absolute; z-index: 0; right: -5%; top: 50%; width: min(52%, 680px); height: 112%; object-fit: cover; object-position: right center; transform: translateY(-50%); opacity: .78; pointer-events: none; -webkit-mask-image: linear-gradient(90deg, transparent 0%, hsl(var(--background) / 20%) 22%, #000 42%); mask-image: linear-gradient(90deg, transparent 0%, hsl(var(--background) / 20%) 22%, #000 42%); }
.page-hero__image--center { right: -3%; width: min(46%, 600px); }
.page-hero__glow { position: absolute; right: 22%; top: -80px; width: 220px; height: 220px; border-radius: 999px; background: hsl(var(--primary) / 9%); filter: blur(34px); }
@media (max-width: 900px) {
  .page-hero__content, .page-hero:has(.page-hero__actions) .page-hero__content { max-width: 100%; padding-right: 24px; }
  .page-hero__image { opacity: .22; width: 65%; }
  .page-hero__actions { right: 16px; }
}
@media (max-width: 680px) {
  .page-hero:has(.page-hero__actions) { padding-bottom: 58px; }
  .page-hero__actions { top: auto; bottom: 12px; left: 20px; right: 16px; flex-wrap: wrap; }
  .page-hero__tabs { position: relative; left: auto; bottom: auto; margin-top: 12px; }
}
</style>
