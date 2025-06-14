import { supabase } from '@/integrations/supabase/client';
import { Player, Parent, PlayerTransfer, AttributeHistory } from '@/types';

// Helper to transform DB player to frontend Player
const transformPlayer = (dbPlayer: any): Player => {
  if (!dbPlayer) return null as unknown as Player; // Should ideally throw or handle gracefully
  return {
    ...dbPlayer,
    teamId: dbPlayer.team_id,
    squadNumber: dbPlayer.squad_number,
    dateOfBirth: dbPlayer.date_of_birth,
    subscriptionType: dbPlayer.subscription_type as 'full_squad' | 'training' | 'trialist',
    subscriptionStatus: dbPlayer.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
    kit_sizes: (dbPlayer.kit_sizes as any) || {},
    kitSizes: (dbPlayer.kit_sizes as any) || {}, // backward compatibility
    matchStats: (dbPlayer.match_stats as any) || {},
    leaveDate: dbPlayer.leave_date,
    leaveComments: dbPlayer.leave_comments,
    cardDesignId: dbPlayer.card_design_id,
    funStats: (dbPlayer.fun_stats as Record<string, number>) || {},
    playStyle: dbPlayer.play_style,
    createdAt: dbPlayer.created_at,
    updatedAt: dbPlayer.updated_at,
    type: dbPlayer.type as 'goalkeeper' | 'outfield',
    availability: dbPlayer.availability as 'green' | 'amber' | 'red',
    attributes: (dbPlayer.attributes as any) || [],
    objectives: (dbPlayer.objectives as any) || [],
    comments: (dbPlayer.comments as any) || [],
    photoUrl: dbPlayer.photo_url, // Added photo_url mapping
  };
};

export const playersService = {
  async getActivePlayersByTeamId(teamId: string): Promise<Player[]> {
    console.log('Fetching active players for team:', teamId);
    
    const { data, error } = await supabase
      .from('players')
      .select('*, photo_url') // Ensure photo_url is selected
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('squad_number', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
      throw error;
    }
    
    const players = (data || []).map(transformPlayer);
    console.log('Players fetched successfully:', players);
    return players;
  },

  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    console.log('Creating player:', playerData);
    
    const dbData: any = {
      name: playerData.name,
      team_id: playerData.team_id || playerData.teamId,
      squad_number: playerData.squadNumber,
      date_of_birth: playerData.dateOfBirth,
      type: playerData.type,
      subscription_type: playerData.subscriptionType,
      subscription_status: playerData.subscriptionStatus,
      availability: playerData.availability,
      kit_sizes: playerData.kit_sizes || (playerData as any).kitSizes,
      attributes: playerData.attributes,
      objectives: playerData.objectives,
      comments: playerData.comments,
      card_design_id: playerData.cardDesignId,
      fun_stats: playerData.funStats,
      play_style: playerData.playStyle,
      photo_url: playerData.photoUrl, // Added photo_url
    };
    
    const { data, error } = await supabase
      .from('players')
      .insert([dbData])
      .select('*, photo_url') // Ensure photo_url is selected
      .single();

    if (error) {
      console.error('Error creating player:', error);
      throw error;
    }

    const player = transformPlayer(data);
    console.log('Player created successfully:', player);
    return player;
  },

  async updatePlayer(id: string, playerData: Partial<Player>): Promise<Player> {
    console.log('Updating player:', id, playerData);
    
    const dbData: any = {};
    
    if (playerData.name !== undefined) dbData.name = playerData.name;
    if (playerData.squadNumber !== undefined) dbData.squad_number = playerData.squadNumber;
    if (playerData.dateOfBirth !== undefined) dbData.date_of_birth = playerData.dateOfBirth;
    if (playerData.type !== undefined) dbData.type = playerData.type;
    if (playerData.subscriptionType !== undefined) dbData.subscription_type = playerData.subscriptionType;
    if (playerData.subscriptionStatus !== undefined) dbData.subscription_status = playerData.subscriptionStatus;
    if (playerData.availability !== undefined) dbData.availability = playerData.availability;
    if (playerData.kit_sizes !== undefined || (playerData as any).kitSizes !== undefined) {
      dbData.kit_sizes = playerData.kit_sizes || (playerData as any).kitSizes;
    }
    if (playerData.attributes !== undefined) dbData.attributes = playerData.attributes;
    if (playerData.objectives !== undefined) dbData.objectives = playerData.objectives;
    if (playerData.comments !== undefined) dbData.comments = playerData.comments;
    if (playerData.cardDesignId !== undefined) dbData.card_design_id = playerData.cardDesignId;
    if (playerData.funStats !== undefined) dbData.fun_stats = playerData.funStats;
    if (playerData.playStyle !== undefined) dbData.play_style = playerData.playStyle;
    if (playerData.photoUrl !== undefined) dbData.photo_url = playerData.photoUrl; // Added photo_url
    if (playerData.status !== undefined) dbData.status = playerData.status;
    if (playerData.leaveDate !== undefined) dbData.leave_date = playerData.leaveDate;
    if (playerData.leaveComments !== undefined) dbData.leave_comments = playerData.leaveComments;

    const { data, error } = await supabase
      .from('players')
      .update(dbData)
      .eq('id', id)
      .select('*, photo_url') // Ensure photo_url is selected
      .single();

    if (error) {
      console.error('Error updating player:', error);
      throw error;
    }

    const player = transformPlayer(data);
    console.log('Player updated successfully:', player);
    return player;
  },

  async deletePlayer(id: string): Promise<void> {
    console.log('Deleting player:', id);
    
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting player:', error);
      throw error;
    }

    console.log('Player deleted successfully');
  },

  async getPlayerById(id: string): Promise<Player | null> {
    console.log('Fetching player by ID:', id);
    
    const { data, error } = await supabase
      .from('players')
      .select('*, photo_url') // Ensure photo_url is selected
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching player:', error);
      throw error;
    }

    if (!data) {
      console.log('Player not found');
      return null;
    }
    
    const player = transformPlayer(data);
    console.log('Player fetched by ID:', player);
    return player;
  },

  async uploadPlayerPhoto(playerId: string, file: File): Promise<string> {
    console.log(`Uploading photo for player ${playerId}:`, file.name);
    const fileExt = file.name.split('.').pop();
    const fileName = `${playerId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('player_photos')
      .upload(fileName, file, {
        cacheControl: '3600', // Cache for 1 hour
        upsert: true, // Overwrite if file already exists (e.g., re-upload)
      });

    if (error) {
      console.error('Error uploading player photo:', error);
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('player_photos')
      .getPublicUrl(data.path);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Error getting public URL for player photo');
      throw new Error('Could not retrieve public URL for the uploaded photo.');
    }
    
    console.log('Photo uploaded successfully. Public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  },

  async removePlayerPhoto(playerId: string): Promise<Player> {
    console.log(`Attempting to remove photo for player ${playerId}`);

    // 1. Get current player to find their photo URL
    const player = await this.getPlayerById(playerId);
    if (!player) {
      console.error(`Player with ID ${playerId} not found for photo removal.`);
      throw new Error('Player not found.');
    }
    if (!player.photoUrl) {
      console.log(`Player ${playerId} has no photo to remove.`);
      return player; // Return player as is, no changes needed
    }

    const photoUrl = player.photoUrl;
    console.log(`Found photo URL for player ${playerId}: ${photoUrl}`);

    // 2. Extract path from URL
    const bucketName = 'player_photos'; 
    // Example URL: https://<project-ref>.supabase.co/storage/v1/object/public/player_photos/path/to/file.jpg
    // We need to extract "path/to/file.jpg"
    const urlPrefix = `/storage/v1/object/public/${bucketName}/`;
    const pathStartIndex = photoUrl.indexOf(urlPrefix);

    if (pathStartIndex === -1) {
      console.error('Invalid photo URL format, cannot extract path:', photoUrl);
      throw new Error('Invalid photo URL format.');
    }
    const photoPath = photoUrl.substring(pathStartIndex + urlPrefix.length);
    console.log(`Extracted photo path: ${photoPath}`);

    // 3. Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([photoPath]);

    if (storageError) {
      console.error('Error deleting photo from storage:', storageError);
      // Decide if we should still update the DB. For now, let's throw.
      throw storageError; 
    }
    console.log('Photo successfully deleted from storage:', photoPath);

    // 4. Update player record (set photoUrl to null)
    // Ensure a distinct object is passed to updatePlayer to avoid issues with partial updates
    const updatedPlayer = await this.updatePlayer(playerId, { photoUrl: null });
    console.log(`Player record updated for ${playerId}, photoUrl set to null.`);
    return updatedPlayer;
  },

  async getParentsByPlayerId(playerId: string): Promise<Parent[]> {
    console.log('Fetching parents for player:', playerId);
    
    const { data, error } = await supabase
      .from('parents')
      .select('*')
      .eq('player_id', playerId);

    if (error) {
      console.error('Error fetching parents:', error);
      throw error;
    }

    // Transform database fields to match our TypeScript types
    const parents = (data || []).map(parent => ({
      ...parent,
      playerId: parent.player_id,
      linkCode: parent.link_code,
      subscriptionType: parent.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: parent.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      createdAt: parent.created_at,
      updatedAt: parent.updated_at
    }));

    console.log('Parents fetched successfully:', parents);
    return parents;
  },

  async createParent(parentData: Partial<Parent>): Promise<Parent> {
    console.log('Creating parent:', parentData);
    
    const dbData = {
      name: parentData.name,
      email: parentData.email,
      phone: parentData.phone,
      player_id: parentData.playerId,
      subscription_type: parentData.subscriptionType,
      subscription_status: parentData.subscriptionStatus
    };
    
    const { data, error } = await supabase
      .from('parents')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error('Error creating parent:', error);
      throw error;
    }

    const parent = {
      ...data,
      playerId: data.player_id,
      linkCode: data.link_code,
      subscriptionType: data.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: data.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    console.log('Parent created successfully:', parent);
    return parent;
  },

  async updateParent(id: string, parentData: Partial<Parent>): Promise<Parent> {
    console.log('Updating parent:', id, parentData);
    
    const dbData: any = {};
    if (parentData.name !== undefined) dbData.name = parentData.name;
    if (parentData.email !== undefined) dbData.email = parentData.email;
    if (parentData.phone !== undefined) dbData.phone = parentData.phone;
    if (parentData.subscriptionType !== undefined) dbData.subscription_type = parentData.subscriptionType;
    if (parentData.subscriptionStatus !== undefined) dbData.subscription_status = parentData.subscriptionStatus;

    const { data, error } = await supabase
      .from('parents')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating parent:', error);
      throw error;
    }

    const parent = {
      ...data,
      playerId: data.player_id,
      linkCode: data.link_code,
      subscriptionType: data.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: data.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    console.log('Parent updated successfully:', parent);
    return parent;
  },

  async deleteParent(id: string): Promise<void> {
    console.log('Deleting parent:', id);
    
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting parent:', error);
      throw error;
    }

    console.log('Parent deleted successfully');
  },

  async regenerateParentLinkCode(id: string): Promise<string> {
    console.log('Regenerating link code for parent:', id);
    
    // Generate new link code (8 random bytes as hex)
    const newLinkCode = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const { data, error } = await supabase
      .from('parents')
      .update({ link_code: newLinkCode })
      .eq('id', id)
      .select('link_code')
      .single();

    if (error) {
      console.error('Error regenerating link code:', error);
      throw error;
    }

    console.log('Link code regenerated successfully:', data.link_code);
    return data.link_code;
  },

  async getTransferHistory(playerId: string): Promise<PlayerTransfer[]> {
    console.log('Fetching transfer history for player:', playerId);
    
    const { data, error } = await supabase
      .from('player_transfers')
      .select('*')
      .eq('player_id', playerId)
      .order('transfer_date', { ascending: false });

    if (error) {
      console.error('Error fetching transfer history:', error);
      throw error;
    }

    const transfers = (data || []).map(transfer => ({
      ...transfer,
      playerId: transfer.player_id,
      fromTeamId: transfer.from_team_id,
      toTeamId: transfer.to_team_id,
      transferDate: transfer.transfer_date,
      dataTransferOptions: (transfer.data_transfer_options as any) || {
        full: false,
        attributes: false,
        comments: false,
        objectives: false,
        events: false
      },
      requestedBy: transfer.requested_by,
      acceptedBy: transfer.accepted_by,
      createdAt: transfer.created_at,
      updatedAt: transfer.updated_at,
      status: transfer.status as 'pending' | 'accepted' | 'rejected'
    }));

    console.log('Transfer history fetched successfully:', transfers);
    return transfers;
  },

  async getAttributeHistory(playerId: string, attributeName: string): Promise<AttributeHistory[]> {
    console.log('Fetching attribute history for player:', playerId, 'attribute:', attributeName);
    
    const { data, error } = await supabase
      .from('player_attribute_history')
      .select('*')
      .eq('player_id', playerId)
      .eq('attribute_name', attributeName)
      .order('recorded_date', { ascending: false });

    if (error) {
      console.error('Error fetching attribute history:', error);
      throw error;
    }

    const history = (data || []).map(record => ({
      ...record,
      playerId: record.player_id,
      attributeName: record.attribute_name,
      attributeGroup: record.attribute_group,
      recordedDate: record.recorded_date,
      recordedBy: record.recorded_by,
      createdAt: record.created_at
    }));

    console.log('Attribute history fetched successfully:', history);
    return history;
  },

  async removePlayerFromSquad(playerId: string): Promise<void> {
    console.log('Removing player from squad:', playerId);
    
    const { error } = await supabase
      .from('players')
      .update({ status: 'inactive' }) // Keep existing inactive logic, or use 'left' if that's more appropriate
      .eq('id', playerId);

    if (error) {
      console.error('Error removing player from squad:', error);
      throw error;
    }

    console.log('Player removed from squad successfully');
  }
};
