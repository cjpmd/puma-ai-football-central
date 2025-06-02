
export interface KitDesign {
  shirtColor: string;
  sleeveColor: string;
  hasStripes: boolean;
  stripeColor: string;
  shortsColor: string;
  socksColor: string;
}

export interface KitDesigns {
  home: KitDesign;
  away: KitDesign;
  training: KitDesign;
  goalkeeper: KitDesign;
}

export interface KitIcons {
  home: string;
  away: string;
  training: string;
  goalkeeper: string;
}
