import { computed } from 'vue';
import { useTheme } from './useTheme.js';

// hero 配图是位图，主题切换没法靠 CSS 变量改色，只能各备一张。
// 棕色版由蓝色原图做图生图重上色，构图完全一致，所以可直接按主题对调。
import apps from '@/assets/hero-apps.jpg';
import chat from '@/assets/hero-chat.jpg';
import code from '@/assets/hero-code.jpg';
import knowledge from '@/assets/hero-knowledge.jpg';
import projects from '@/assets/hero-projects.jpg';
import skills from '@/assets/hero-skills.jpg';
import spec from '@/assets/hero-spec.jpg';
import training from '@/assets/hero-training.jpg';
import workbench from '@/assets/top.png';

import appsBrown from '@/assets/hero-apps-brown.jpg';
import chatBrown from '@/assets/hero-chat-brown.jpg';
import codeBrown from '@/assets/hero-code-brown.jpg';
import knowledgeBrown from '@/assets/hero-knowledge-brown.jpg';
import projectsBrown from '@/assets/hero-projects-brown.jpg';
import skillsBrown from '@/assets/hero-skills-brown.jpg';
import specBrown from '@/assets/hero-spec-brown.jpg';
import trainingBrown from '@/assets/hero-training-brown.jpg';
import workbenchBrown from '@/assets/hero-workbench-brown.jpg';
import topBrown from '@/assets/top-brown.jpg';

const HEROES = {
  apps: [apps, appsBrown],
  chat: [chat, chatBrown],
  code: [code, codeBrown],
  knowledge: [knowledge, knowledgeBrown],
  projects: [projects, projectsBrown],
  skills: [skills, skillsBrown],
  spec: [spec, specBrown],
  training: [training, trainingBrown],
  workbench: [workbench, workbenchBrown],
  top: [workbench, topBrown],
};

export function useHeroImage(name) {
  const { theme } = useTheme();
  return computed(() => {
    const pair = HEROES[name];
    if (!pair) return '';
    return theme.value === 'brown' ? pair[1] : pair[0];
  });
}
