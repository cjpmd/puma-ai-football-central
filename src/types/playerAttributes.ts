export interface PlayerAttribute {
  id: string;
  name: string;
  group: 'goalkeeping' | 'mental' | 'physical' | 'technical';
  value: number;
  enabled: boolean;
}

export const STANDARD_PLAYER_ATTRIBUTES: PlayerAttribute[] = [
  // GOALKEEPING
  { id: 'aerial_reach', name: 'Aerial Reach', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'command_of_area', name: 'Command of Area', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'communication', name: 'Communication', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'cross_handling', name: 'Cross Handling', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'distribution', name: 'Distribution', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'eccentricity', name: 'Eccentricity', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'footwork', name: 'Footwork', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'handling', name: 'Handling', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'kicking', name: 'Kicking', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'one_on_one', name: 'One-on-One', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'punching', name: 'Punching', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'reflexes', name: 'Reflexes', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'rushing_out', name: 'Rushing Out', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'shot_stopping', name: 'Shot Stopping', group: 'goalkeeping', value: 5, enabled: true },
  { id: 'throwing', name: 'Throwing', group: 'goalkeeping', value: 5, enabled: true },

  // MENTAL
  { id: 'aggression', name: 'Aggression', group: 'mental', value: 5, enabled: true },
  { id: 'anticipation', name: 'Anticipation', group: 'mental', value: 5, enabled: true },
  { id: 'bravery', name: 'Bravery', group: 'mental', value: 5, enabled: true },
  { id: 'composure', name: 'Composure', group: 'mental', value: 5, enabled: true },
  { id: 'concentration', name: 'Concentration', group: 'mental', value: 5, enabled: true },
  { id: 'decisions', name: 'Decisions', group: 'mental', value: 5, enabled: true },
  { id: 'determination', name: 'Determination', group: 'mental', value: 5, enabled: true },
  { id: 'flair', name: 'Flair', group: 'mental', value: 5, enabled: true },
  { id: 'leadership', name: 'Leadership', group: 'mental', value: 5, enabled: true },
  { id: 'off_the_ball', name: 'Off the Ball', group: 'mental', value: 5, enabled: true },
  { id: 'positioning', name: 'Positioning', group: 'mental', value: 5, enabled: true },
  { id: 'teamwork', name: 'Teamwork', group: 'mental', value: 5, enabled: true },
  { id: 'vision', name: 'Vision', group: 'mental', value: 5, enabled: true },
  { id: 'work_rate', name: 'Work Rate', group: 'mental', value: 5, enabled: true },

  // PHYSICAL
  { id: 'acceleration', name: 'Acceleration', group: 'physical', value: 5, enabled: true },
  { id: 'agility', name: 'Agility', group: 'physical', value: 5, enabled: true },
  { id: 'balance', name: 'Balance', group: 'physical', value: 5, enabled: true },
  { id: 'jumping', name: 'Jumping', group: 'physical', value: 5, enabled: true },
  { id: 'natural_fitness', name: 'Natural Fitness', group: 'physical', value: 5, enabled: true },
  { id: 'pace', name: 'Pace', group: 'physical', value: 5, enabled: true },
  { id: 'stamina', name: 'Stamina', group: 'physical', value: 5, enabled: true },
  { id: 'strength', name: 'Strength', group: 'physical', value: 5, enabled: true },

  // TECHNICAL
  { id: 'corners', name: 'Corners', group: 'technical', value: 5, enabled: true },
  { id: 'crossing', name: 'Crossing', group: 'technical', value: 5, enabled: true },
  { id: 'dribbling', name: 'Dribbling', group: 'technical', value: 5, enabled: true },
  { id: 'finishing', name: 'Finishing', group: 'technical', value: 5, enabled: true },
  { id: 'first_touch', name: 'First Touch', group: 'technical', value: 5, enabled: true },
  { id: 'free_kicks', name: 'Free Kicks', group: 'technical', value: 5, enabled: true },
  { id: 'heading', name: 'Heading', group: 'technical', value: 5, enabled: true },
  { id: 'long_shots', name: 'Long Shots', group: 'technical', value: 5, enabled: true },
  { id: 'long_throws', name: 'Long Throws', group: 'technical', value: 5, enabled: true },
  { id: 'marking', name: 'Marking', group: 'technical', value: 5, enabled: true },
  { id: 'passing', name: 'Passing', group: 'technical', value: 5, enabled: true },
  { id: 'penalties', name: 'Penalties', group: 'technical', value: 5, enabled: true },
  { id: 'tackling', name: 'Tackling', group: 'technical', value: 5, enabled: true },
  { id: 'technique', name: 'Technique', group: 'technical', value: 5, enabled: true }
];
