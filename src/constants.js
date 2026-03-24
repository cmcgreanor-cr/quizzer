export const OPTION_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-yellow-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
]

export const OPTION_COLORS_INTERACTIVE = [
  'bg-red-500 hover:bg-red-400 active:bg-red-600',
  'bg-blue-500 hover:bg-blue-400 active:bg-blue-600',
  'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600',
  'bg-green-500 hover:bg-green-400 active:bg-green-600',
  'bg-purple-500 hover:bg-purple-400 active:bg-purple-600',
  'bg-orange-500 hover:bg-orange-400 active:bg-orange-600',
]

export const OPTION_SHAPES = ['▲', '●', '■', '◆', '★', '♥']

export const optionGridCols = (count) =>
  count <= 2 ? 'grid-cols-1' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3'
