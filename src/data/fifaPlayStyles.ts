export type FifaPlayStyleCategory =
  | 'scoring'
  | 'passing'
  | 'ball_control'
  | 'defending'
  | 'physical'
  | 'goalkeeping';

export interface FifaPlayStyle {
  value: string;
  label: string;
  category: FifaPlayStyleCategory;
}

export const FIFA_CATEGORY_COLORS: Record<FifaPlayStyleCategory, string> = {
  scoring: '#F5A623',
  passing: '#00BCD4',
  ball_control: '#9C27B0',
  defending: '#1565C0',
  physical: '#E53935',
  goalkeeping: '#2E7D32',
};

export const FIFA_CATEGORY_LABELS: Record<FifaPlayStyleCategory, string> = {
  scoring: 'Scoring',
  passing: 'Passing',
  ball_control: 'Ball Control',
  defending: 'Defending',
  physical: 'Physical',
  goalkeeping: 'Goalkeeping',
};

export const FIFA_PLAY_STYLES: FifaPlayStyle[] = [
  // Scoring
  { value: 'acrobatic', label: 'Acrobatic', category: 'scoring' },
  { value: 'chip_shot', label: 'Chip Shot', category: 'scoring' },
  { value: 'dead_ball', label: 'Dead Ball', category: 'scoring' },
  { value: 'finesse_shot', label: 'Finesse Shot', category: 'scoring' },
  { value: 'game_changer', label: 'Game Changer', category: 'scoring' },
  { value: 'low_driven_shot', label: 'Low Driven Shot', category: 'scoring' },
  { value: 'power_shot', label: 'Power Shot', category: 'scoring' },
  { value: 'precision_header', label: 'Precision Header', category: 'scoring' },
  // Passing
  { value: 'incisive_pass', label: 'Incisive Pass', category: 'passing' },
  { value: 'inventive', label: 'Inventive', category: 'passing' },
  { value: 'long_ball_pass', label: 'Long Ball Pass', category: 'passing' },
  { value: 'pinged_pass', label: 'Pinged Pass', category: 'passing' },
  { value: 'tiki_taka', label: 'Tiki Taka', category: 'passing' },
  { value: 'whipped_pass', label: 'Whipped Pass', category: 'passing' },
  // Ball Control
  { value: 'first_touch', label: 'First Touch', category: 'ball_control' },
  { value: 'press_proven', label: 'Press Proven', category: 'ball_control' },
  { value: 'rapid', label: 'Rapid', category: 'ball_control' },
  { value: 'technical', label: 'Technical', category: 'ball_control' },
  { value: 'trickster', label: 'Trickster', category: 'ball_control' },
  // Defending
  { value: 'aerial_fortress', label: 'Aerial Fortress', category: 'defending' },
  { value: 'anticipate', label: 'Anticipate', category: 'defending' },
  { value: 'block', label: 'Block', category: 'defending' },
  { value: 'intercept', label: 'Intercept', category: 'defending' },
  { value: 'jockey', label: 'Jockey', category: 'defending' },
  { value: 'slide_tackle', label: 'Slide Tackle', category: 'defending' },
  // Physical
  { value: 'bruiser', label: 'Bruiser', category: 'physical' },
  { value: 'enforcer', label: 'Enforcer', category: 'physical' },
  { value: 'long_throw', label: 'Long Throw', category: 'physical' },
  { value: 'quick_step', label: 'Quick Step', category: 'physical' },
  { value: 'relentless', label: 'Relentless', category: 'physical' },
  // Goalkeeping
  { value: 'cross_claimer', label: 'Cross Claimer', category: 'goalkeeping' },
  { value: 'deflector', label: 'Deflector', category: 'goalkeeping' },
  { value: 'far_reach', label: 'Far Reach', category: 'goalkeeping' },
  { value: 'far_throw', label: 'Far Throw', category: 'goalkeeping' },
  { value: 'footwork', label: 'Footwork', category: 'goalkeeping' },
  { value: 'rush_out', label: 'Rush Out', category: 'goalkeeping' },
];

export const FIFA_PLAY_STYLES_BY_CATEGORY = FIFA_PLAY_STYLES.reduce<
  Record<FifaPlayStyleCategory, FifaPlayStyle[]>
>(
  (acc, style) => {
    acc[style.category].push(style);
    return acc;
  },
  {
    scoring: [],
    passing: [],
    ball_control: [],
    defending: [],
    physical: [],
    goalkeeping: [],
  }
);

export const FIFA_CATEGORY_ORDER: FifaPlayStyleCategory[] = [
  'scoring',
  'passing',
  'ball_control',
  'defending',
  'physical',
  'goalkeeping',
];

export function getFifaPlayStyle(value: string): FifaPlayStyle | undefined {
  return FIFA_PLAY_STYLES.find(s => s.value === value);
}
