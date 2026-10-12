import { defineConfig } from './cli/defineConfig';

// Tools are installed manually from this Moss version's curation list.
// hREA 0.7 runs in a separate conductor during this first experiment.
export default defineConfig({
  toolCurations: [{
    url: 'https://raw.githubusercontent.com/lightningrodlabs/weave-tool-curation/refs/heads/test-0.15/0.15/lists/curations-0.15.json',
    useLists: ['default'],
  }],
  applets: [],
  groups: [{
    name: 'CommonGround Lab — хлеб',
    networkSeed: 'commonground-bread-lab-2026-10-11-v1',
    icon: { type: 'filesystem', path: './resources/icon.png' },
    creatingAgent: { agentIdx: 1, agentProfile: { nickname: 'Потребительский кооператив' } },
    joiningAgents: [
      { agentIdx: 2, agentProfile: { nickname: 'Пекарня' } },
      { agentIdx: 3, agentProfile: { nickname: 'Координатор' } },
    ],
    applets: [],
  }],
});
