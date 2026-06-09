export interface DrillTag {
  id: string;
  name: string;
  color: string | null;
}

export interface DrillMedia {
  id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
}

export interface DrillWithRelations {
  id: string;
  name: string;
  description: string | null;
  practice_design: string | null;
  how_to_play: string | null;
  coach_tips: string[] | null;
  player_tips: string[] | null;
  variations: string[] | null;
  equipment: string[] | null;
  tags: DrillTag[];
  drill_media: DrillMedia[];
}
