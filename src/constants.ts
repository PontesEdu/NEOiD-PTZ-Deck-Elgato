export const PTZ_DIRECTIONS = [
  'up',
  'down',
  'left',
  'right',
  'leftup',
  'leftdown',
  'rightup',
  'rightdown',
  'home',
] as const;

export type PTZDirection = typeof PTZ_DIRECTIONS[number];

export const zoomFocusSpeed = {
  slowest: 1,
  slow: 3,
  normal: 4,
  fast: 6,
  fastest: 7,
} as const;
