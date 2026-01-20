import { supabase } from '@/integrations/supabase/client';
import { Player, Parent, PlayerTransfer, AttributeHistory } from '@/types';
import { prepareImageForUpload, isHeicFormat, isSupportedImageFormat, formatFileSize } from '@/utils/imageUtils';

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
    console.log(`[playersService] Uploading photo for player ${playerId}:`, {
      name: file.name,
      type: file.type,
      size: formatFileSize(file.size),
    });
    
    // Validate and preprocess the image
    if (isHeicFormat(file)) {
      throw new Error('HEIC/HEIF format is not supported. Please convert to JPEG or PNG before uploading.');
    }
    
    if (!isSupportedImageFormat(file)) {
      throw new Error(`Unsupported image format: ${file.type || 'unknown'}. Please use JPEG, PNG, or WebP.`);
    }
    
    // Resize and compress the image to fit within storage limits
    let processedBlob: Blob;
    try {
      processedBlob = await prepareImageForUpload(file, {
        maxDimension: 1024,
        quality: 0.85,
        outputFormat: 'image/jpeg',
      });
      console.log(`[playersService] Image processed: ${formatFileSize(file.size)} -> ${formatFileSize(processedBlob.size)}`);
    } catch (processingError: any) {
      console.error('[playersService] Image processing failed:', processingError);
      throw new Error(`Image processing failed: ${processingError.message}`);
    }
    
    // Create filename with .jpg extension (since we always output JPEG)
    const fileName = `${playerId}/${Date.now()}.jpg`;
    
    // Upload the processed image
    const { data, error } = await supabase.storage
      .from('player_photos')
      .upload(fileName, processedBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('[playersService] Error uploading player photo:', error);
      // Provide more helpful error message
      if (error.message?.includes('size') || error.message?.includes('exceeded')) {
        throw new Error(`Upload failed: Image too large (${formatFileSize(processedBlob.size)}). Please try a smaller image.`);
      }
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('player_photos')
      .getPublicUrl(data.path);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('[playersService] Error getting public URL for player photo');
      throw new Error('Could not retrieve public URL for the uploaded photo.');
    }
    
    console.log('[playersService] Photo uploaded successfully. Public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  },

  async getParentsByPlayerId(playerId: string): Promise<Parent[]> {
    console.log('Fetching parents for player:', playerId);
    
    // Get parents from the parents table
    const { data: parentsData, error: parentsError } = await supabase
      .from('parents')
      .select('*')
      .eq('player_id', playerId);

    if (parentsError) {
      console.error('Error fetching parents:', parentsError);
      throw parentsError;
    }

    // Get linked parents from user_players table
    const { data: linkedParentsData, error: linkedParentsError } = await supabase
      .from('user_players')
      .select('user_id, relationship')
      .eq('player_id', playerId)
      .eq('relationship', 'parent');

    if (linkedParentsError) {
      console.error('Error fetching linked parents:', linkedParentsError);
      throw linkedParentsError;
    }

    // Get profile data for linked parents
    const linkedParentsWithProfiles = [];
    if (linkedParentsData && linkedParentsData.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .in('id', linkedParentsData.map(lp => lp.user_id));

      if (profilesError) {
        console.error('Error fetching profiles for linked parents:', profilesError);
      } else {
        for (const link of linkedParentsData) {
          const profile = profilesData?.find(p => p.id === link.user_id);
          if (profile) {
            linkedParentsWithProfiles.push({
              link,
              profile
            });
          }
        }
      }
    }

    // Transform database fields to match our TypeScript types
    const parents = (parentsData || []).map(parent => ({
      ...parent,
      playerId: parent.player_id,
      linkCode: parent.link_code,
      subscriptionType: parent.subscription_type as 'full_squad' | 'training' | 'trialist',
      subscriptionStatus: parent.subscription_status as 'active' | 'inactive' | 'pending' | 'paused',
      createdAt: parent.created_at,
      updatedAt: parent.updated_at,
      isLinked: false
    }));

    // Add linked parents from user accounts
    const linkedParents = linkedParentsWithProfiles.map(({ link, profile }) => ({
      id: `linked_${link.user_id}`,
      name: profile.name || 'Unknown',
      email: profile.email || '',
      phone: profile.phone || '',
      playerId: playerId,
      subscriptionType: 'full_squad' as const,
      subscriptionStatus: 'active' as const,
      linkCode: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isLinked: true,
      userId: link.user_id
    }));

    const allParents = [...parents, ...linkedParents];
    console.log('All parents fetched successfully:', allParents);
    return allParents;
  },

  async removeLinkedParent(playerId: string, userId: string): Promise<void> {
    console.log('Removing linked parent:', userId, 'from player:', playerId);
    
    const { error } = await supabase
      .from('user_players')
      .delete()
      .eq('player_id', playerId)
      .eq('user_id', userId)
      .eq('relationship', 'parent');

    if (error) {
      console.error('Error removing linked parent:', error);
      throw error;
    }

    console.log('Linked parent removed successfully');
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

  async deletePlayerPhoto(player: Player): Promise<Player> {
    console.log(`Deleting photo for player ${player.id}`);
    if (!player.photoUrl) {
        console.log('Player has no photo to delete.');
        return player;
    }

    try {
        // Extract file path from URL
        const url = new URL(player.photoUrl);
        const pathParts = url.pathname.split('/');
        const bucketName = 'player_photos';
        const bucketIndex = pathParts.indexOf(bucketName);
        if (bucketIndex === -1) {
            throw new Error('Bucket name not found in URL path');
        }
        const filePath = pathParts.slice(bucketIndex + 1).join('/');

        if (filePath) {
            console.log('File path to delete from storage:', filePath);
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);
            
            if (storageError) {
                // This could happen if the file was manually deleted from storage but the URL remains on the player.
                // We can still proceed to clear the URL from the player record.
                console.warn('Error deleting photo from storage, but proceeding to clear URL:', storageError);
            }
        }
    } catch(e) {
        console.error('Error parsing or deleting photo from storage, proceeding to clear URL from player record', e);
    }

    // Update player record to remove photoUrl. This is the main goal.
    const { data, error } = await supabase
        .from('players')
        .update({ photo_url: null })
        .eq('id', player.id)
        .select('*, photo_url')
        .single();

    if (error) {
        console.error('Error updating player to remove photo URL:', error);
        throw error;
    }
    
    const updatedPlayer = transformPlayer(data);
    console.log('Player photo URL cleared successfully:', updatedPlayer);
    return updatedPlayer;
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
