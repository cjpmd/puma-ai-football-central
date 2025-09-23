export interface PlayStyle {
  value: string;
  label: string;
  icon: string;
  category: 'attacker' | 'midfielder' | 'defender' | 'goalkeeper';
}

export const DEFAULT_PLAY_STYLES: PlayStyle[] = [
  { value: "finisher", label: "Finisher", icon: "🎯", category: "attacker" },
  { value: "clinical", label: "Clinical", icon: "✅", category: "attacker" },
  { value: "speedster", label: "Speedster", icon: "⚡", category: "attacker" },
  { value: "trickster", label: "Trickster", icon: "🔮", category: "attacker" },
  { value: "playmaker", label: "Playmaker", icon: "🎭", category: "midfielder" },
  { value: "engine", label: "Engine", icon: "⚙️", category: "midfielder" },
  { value: "maestro", label: "Maestro", icon: "🎩", category: "midfielder" },
  { value: "workhorse", label: "Workhorse", icon: "💪", category: "midfielder" },
  { value: "guardian", label: "Guardian", icon: "🛡️", category: "defender" },
  { value: "interceptor", label: "Interceptor", icon: "⚔️", category: "defender" },
  { value: "rock", label: "Rock", icon: "🗿", category: "defender" },
  { value: "sweeper", label: "Sweeper", icon: "🧹", category: "defender" },
  { value: "reflexes", label: "Reflexes", icon: "🥅", category: "goalkeeper" },
  { value: "commander", label: "Commander", icon: "👑", category: "goalkeeper" },
  { value: "wall", label: "Wall", icon: "🧱", category: "goalkeeper" }
];

// Function to manage custom play styles
export const playStylesService = {
  // Get all play styles (default + custom)
  getAllPlayStyles: (): PlayStyle[] => {
    const customStyles = localStorage.getItem('customPlayStyles');
    if (customStyles) {
      try {
        const parsed = JSON.parse(customStyles);
        return [...DEFAULT_PLAY_STYLES, ...parsed];
      } catch (e) {
        console.error('Error parsing custom play styles:', e);
      }
    }
    return DEFAULT_PLAY_STYLES;
  },

  // Add a custom play style
  addCustomPlayStyle: (playStyle: PlayStyle): void => {
    const existing = playStylesService.getAllPlayStyles();
    const custom = existing.filter(style => !DEFAULT_PLAY_STYLES.find(def => def.value === style.value));
    custom.push(playStyle);
    localStorage.setItem('customPlayStyles', JSON.stringify(custom));
  },

  // Remove a custom play style
  removeCustomPlayStyle: (value: string): void => {
    const existing = playStylesService.getAllPlayStyles();
    const custom = existing.filter(style => 
      !DEFAULT_PLAY_STYLES.find(def => def.value === style.value) && style.value !== value
    );
    localStorage.setItem('customPlayStyles', JSON.stringify(custom));
  },

  // Update a custom play style
  updateCustomPlayStyle: (value: string, updatedStyle: PlayStyle): void => {
    const existing = playStylesService.getAllPlayStyles();
    const custom = existing.filter(style => !DEFAULT_PLAY_STYLES.find(def => def.value === style.value));
    const index = custom.findIndex(style => style.value === value);
    if (index !== -1) {
      custom[index] = updatedStyle;
      localStorage.setItem('customPlayStyles', JSON.stringify(custom));
    }
  }
};