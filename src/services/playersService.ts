import { supabase } from '@/integrations/supabase/client';
import { Player, PlayerAttribute, PlayerObjective, PlayerComment, MatchStats, Position, Parent, PlayerTransfer, AttributeHistory, SubscriptionStatus, PlayerSubscriptionType } from '@/types';

export const playersService = {
  async getPlayersByTeamId(teamId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('squad_number');

    if (error) {
      console.error('Error fetching players:', error);
      throw error;
    }

    // Transform database format to application format
    return (data || []).map(player => ({
      id: player.id,
      name: player.name,
      dateOfBirth: player.date_of_birth,
      squadNumber: player.squad_number,
      type: player.type as "outfield" | "goalkeeper",
      teamId: player.team_id,
      availability: player.availability as "amber" | "green" | "red",
      subscriptionType: player.subscription_type as "full_squad" | "training",
      subscriptionStatus: player.subscription_status as "active" | "inactive" | "pending",
      status: player.status as "active" | "inactive",
      leaveDate: player.leave_date,
      leaveComments: player.leave_comments,
      attributes: (player.attributes as PlayerAttribute[]) || [],
      objectives: (player.objectives as PlayerObjective[]) || [],
      comments: (player.comments as PlayerComment[]) || [],
      matchStats: (player.match_stats as MatchStats) || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {} as Record<Position, number>,
        recentGames: []
      },
      createdAt: player.created_at,
      updatedAt: player.updated_at
    }));
  },

  async getActivePlayersByTeamId(teamId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('squad_number');

    if (error) {
      console.error('Error fetching active players:', error);
      throw error;
    }

    // Transform database format to application format (same as getPlayersByTeamId)
    return (data || []).map(player => ({
      id: player.id,
      name: player.name,
      dateOfBirth: player.date_of_birth,
      squadNumber: player.squad_number,
      type: player.type as "outfield" | "goalkeeper",
      teamId: player.team_id,
      availability: player.availability as "amber" | "green" | "red",
      subscriptionType: player.subscription_type as "full_squad" | "training",
      subscriptionStatus: player.subscription_status as "active" | "inactive" | "pending",
      status: player.status as "active" | "inactive",
      leaveDate: player.leave_date,
      leaveComments: player.leave_comments,
      attributes: (player.attributes as PlayerAttribute[]) || [],
      objectives: (player.objectives as PlayerObjective[]) || [],
      comments: (player.comments as PlayerComment[]) || [],
      matchStats: (player.match_stats as MatchStats) || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {} as Record<Position, number>,
        recentGames: []
      },
      createdAt: player.created_at,
      updatedAt: player.updated_at
    }));
  },

  async getInactivePlayersByTeamId(teamId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'inactive')
      .order('leave_date', { ascending: false });

    if (error) {
      console.error('Error fetching inactive players:', error);
      throw error;
    }

    // Transform database format to application format (same as above)
    return (data || []).map(player => ({
      id: player.id,
      name: player.name,
      dateOfBirth: player.date_of_birth,
      squadNumber: player.squad_number,
      type: player.type as "outfield" | "goalkeeper",
      teamId: player.team_id,
      availability: player.availability as "amber" | "green" | "red",
      subscriptionType: player.subscription_type as "full_squad" | "training",
      subscriptionStatus: player.subscription_status as "active" | "inactive" | "pending",
      status: player.status as "active" | "inactive",
      leaveDate: player.leave_date,
      leaveComments: player.leave_comments,
      attributes: (player.attributes as PlayerAttribute[]) || [],
      objectives: (player.objectives as PlayerObjective[]) || [],
      comments: (player.comments as PlayerComment[]) || [],
      matchStats: (player.match_stats as MatchStats) || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {} as Record<Position, number>,
        recentGames: []
      },
      createdAt: player.created_at,
      updatedAt: player.updated_at
    }));
  },

  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .insert([{
        name: playerData.name,
        date_of_birth: playerData.dateOfBirth,
        squad_number: playerData.squadNumber,
        type: playerData.type,
        team_id: playerData.teamId,
        availability: playerData.availability || 'green',
        subscription_type: playerData.subscriptionType || 'full_squad',
        subscription_status: playerData.subscriptionStatus || 'active',
        status: playerData.status || 'active',
        attributes: playerData.attributes || [],
        objectives: playerData.objectives || [],
        comments: playerData.comments || [],
        match_stats: playerData.matchStats || {
          totalGames: 0,
          captainGames: 0,
          playerOfTheMatchCount: 0,
          totalMinutes: 0,
          minutesByPosition: {},
          recentGames: []
        }
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating player:', error);
      throw error;
    }

    // Transform database response to app format
    return {
      id: data.id,
      name: data.name,
      dateOfBirth: data.date_of_birth,
      squadNumber: data.squad_number,
      type: data.type as "outfield" | "goalkeeper",
      teamId: data.team_id,
      availability: data.availability as "amber" | "green" | "red",
      subscriptionType: data.subscription_type as "full_squad" | "training",
      subscriptionStatus: data.subscription_status as "active" | "inactive" | "pending",
      status: data.status as "active" | "inactive",
      leaveDate: data.leave_date,
      leaveComments: data.leave_comments,
      attributes: (data.attributes as PlayerAttribute[]) || [],
      objectives: (data.objectives as PlayerObjective[]) || [],
      comments: (data.comments as PlayerComment[]) || [],
      matchStats: (data.match_stats as MatchStats) || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {} as Record<Position, number>,
        recentGames: []
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async updatePlayer(playerId: string, playerData: Partial<Player>): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update({
        name: playerData.name,
        date_of_birth: playerData.dateOfBirth,
        squad_number: playerData.squadNumber,
        type: playerData.type,
        availability: playerData.availability,
        subscription_type: playerData.subscriptionType,
        subscription_status: playerData.subscriptionStatus,
        status: playerData.status,
        leave_date: playerData.leaveDate,
        leave_comments: playerData.leaveComments,
        attributes: playerData.attributes,
        objectives: playerData.objectives,
        comments: playerData.comments,
        match_stats: playerData.matchStats,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating player:', error);
      throw error;
    }

    // Transform database response to app format
    return {
      id: data.id,
      name: data.name,
      dateOfBirth: data.date_of_birth,
      squadNumber: data.squad_number,
      type: data.type as "outfield" | "goalkeeper",
      teamId: data.team_id,
      availability: data.availability as "amber" | "green" | "red",
      subscriptionType: data.subscription_type as "full_squad" | "training",
      subscriptionStatus: data.subscription_status as "active" | "inactive" | "pending",
      status: data.status as "active" | "inactive",
      leaveDate: data.leave_date,
      leaveComments: data.leave_comments,
      attributes: (data.attributes as PlayerAttribute[]) || [],
      objectives: (data.objectives as PlayerObjective[]) || [],
      comments: (data.comments as PlayerComment[]) || [],
      matchStats: (data.match_stats as MatchStats) || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {} as Record<Position, number>,
        recentGames: []
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async markPlayerAsInactive(playerId: string, leaveDate: string, leaveComments?: string): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update({
        status: 'inactive',
        leave_date: leaveDate,
        leave_comments: leaveComments,
        subscription_status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Error marking player as inactive:', error);
      throw error;
    }

    // Transform database response to app format
    return {
      id: data.id,
      name: data.name,
      dateOfBirth: data.date_of_birth,
      squadNumber: data.squad_number,
      type: data.type as "outfield" | "goalkeeper",
      teamId: data.team_id,
      availability: data.availability as "amber" | "green" | "red",
      subscriptionType: data.subscription_type as "full_squad" | "training",
      subscriptionStatus: data.subscription_status as "active" | "inactive" | "pending",
      status: data.status as "active" | "inactive",
      leaveDate: data.leave_date,
      leaveComments: data.leave_comments,
      attributes: (data.attributes as PlayerAttribute[]) || [],
      objectives: (data.objectives as PlayerObjective[]) || [],
      comments: (data.comments as PlayerComment[]) || [],
      matchStats: (data.match_stats as MatchStats) || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {} as Record<Position, number>,
        recentGames: []
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async resurrectPlayer(playerId: string): Promise<Player> {
    const { data, error } = await supabase
      .from('players')
      .update({
        status: 'active',
        leave_date: null,
        leave_comments: null,
        subscription_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      console.error('Error resurrecting player:', error);
      throw error;
    }

    // Transform database response to app format
    return {
      id: data.id,
      name: data.name,
      dateOfBirth: data.date_of_birth,
      squadNumber: data.squad_number,
      type: data.type as "outfield" | "goalkeeper",
      teamId: data.team_id,
      availability: data.availability as "amber" | "green" | "red",
      subscriptionType: data.subscription_type as "full_squad" | "training",
      subscriptionStatus: data.subscription_status as "active" | "inactive" | "pending",
      status: data.status as "active" | "inactive",
      leaveDate: data.leave_date,
      leaveComments: data.leave_comments,
      attributes: (data.attributes as PlayerAttribute[]) || [],
      objectives: (data.objectives as PlayerObjective[]) || [],
      comments: (data.comments as PlayerComment[]) || [],
      matchStats: (data.match_stats as MatchStats) || {
        totalGames: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        totalMinutes: 0,
        minutesByPosition: {} as Record<Position, number>,
        recentGames: []
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async deletePlayer(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  },

  async getParentsByPlayerId(playerId: string): Promise<Parent[]> {
    const { data, error } = await supabase
      .from('parents')
      .select('*')
      .eq('player_id', playerId);

    if (error) {
      console.error('Error fetching parents:', error);
      throw error;
    }

    return (data || []).map(parent => ({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      playerId: parent.player_id,
      linkCode: parent.link_code,
      subscriptionType: parent.subscription_type as PlayerSubscriptionType,
      subscriptionStatus: parent.subscription_status as SubscriptionStatus,
      createdAt: parent.created_at,
      updatedAt: parent.updated_at
    }));
  },

  async createParent(parentData: Partial<Parent>): Promise<Parent> {
    const { data, error } = await supabase
      .from('parents')
      .insert([{
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone,
        player_id: parentData.playerId,
        subscription_type: parentData.subscriptionType as PlayerSubscriptionType,
        subscription_status: parentData.subscriptionStatus as SubscriptionStatus
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating parent:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      playerId: data.player_id,
      linkCode: data.link_code,
      subscriptionType: data.subscription_type as PlayerSubscriptionType,
      subscriptionStatus: data.subscription_status as SubscriptionStatus,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async updateParent(parentId: string, parentData: Partial<Parent>): Promise<Parent> {
    const { data, error } = await supabase
      .from('parents')
      .update({
        name: parentData.name,
        email: parentData.email,
        phone: parentData.phone,
        subscription_type: parentData.subscriptionType as PlayerSubscriptionType,
        subscription_status: parentData.subscriptionStatus as SubscriptionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', parentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating parent:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      playerId: data.player_id,
      linkCode: data.link_code,
      subscriptionType: data.subscription_type as PlayerSubscriptionType,
      subscriptionStatus: data.subscription_status as SubscriptionStatus,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async deleteParent(parentId: string): Promise<void> {
    const { error } = await supabase
      .from('parents')
      .delete()
      .eq('id', parentId);

    if (error) {
      console.error('Error deleting parent:', error);
      throw error;
    }
  },

  async regenerateParentLinkCode(parentId: string): Promise<string> {
    const newLinkCode = Math.random().toString(36).substring(2, 10);
    
    const { data, error } = await supabase
      .from('parents')
      .update({
        link_code: newLinkCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', parentId)
      .select('link_code')
      .single();

    if (error) {
      console.error('Error regenerating link code:', error);
      throw error;
    }

    return data.link_code;
  },

  async initiatePlayerTransfer(transferData: {
    playerId: string;
    fromTeamId: string;
    toTeamId: string;
    dataTransferOptions: {
      full: boolean;
      attributes: boolean;
      comments: boolean;
      objectives: boolean;
      events: boolean;
    };
    requestedById: string;
  }): Promise<PlayerTransfer> {
    const { data, error } = await supabase
      .from('player_transfers')
      .insert([{
        player_id: transferData.playerId,
        from_team_id: transferData.fromTeamId,
        to_team_id: transferData.toTeamId,
        data_transfer_options: transferData.dataTransferOptions,
        requested_by: transferData.requestedById,
        status: 'pending' as const
      }])
      .select()
      .single();

    if (error) {
      console.error('Error initiating player transfer:', error);
      throw error;
    }

    return {
      id: data.id,
      playerId: data.player_id,
      fromTeamId: data.from_team_id,
      toTeamId: data.to_team_id,
      transferDate: data.transfer_date,
      status: data.status as "pending" | "accepted" | "rejected",
      dataTransferOptions: data.data_transfer_options as {
        full: boolean;
        attributes: boolean;
        comments: boolean;
        objectives: boolean;
        events: boolean;
      },
      requestedBy: data.requested_by,
      acceptedBy: data.accepted_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async getPendingTransfersForTeam(teamId: string): Promise<PlayerTransfer[]> {
    const { data, error } = await supabase
      .from('player_transfers')
      .select('*, players(*)')
      .eq('status', 'pending')
      .or(`from_team_id.eq.${teamId},to_team_id.eq.${teamId}`);

    if (error) {
      console.error('Error fetching pending transfers:', error);
      throw error;
    }

    return (data || []).map(transfer => ({
      id: transfer.id,
      playerId: transfer.player_id,
      fromTeamId: transfer.from_team_id,
      toTeamId: transfer.to_team_id,
      transferDate: transfer.transfer_date,
      status: transfer.status as "pending" | "accepted" | "rejected",
      dataTransferOptions: transfer.data_transfer_options as {
        full: boolean;
        attributes: boolean;
        comments: boolean;
        objectives: boolean;
        events: boolean;
      },
      requestedBy: transfer.requested_by,
      acceptedBy: transfer.accepted_by,
      createdAt: transfer.created_at,
      updatedAt: transfer.updated_at,
      player: transfer.players ? {
        id: transfer.players.id,
        name: transfer.players.name,
        squadNumber: transfer.players.squad_number,
        type: transfer.players.type
      } : undefined
    }));
  },

  async acceptPlayerTransfer(transferId: string, acceptedById: string): Promise<PlayerTransfer> {
    // Fetch the transfer details first
    const { data: transferData, error: transferError } = await supabase
      .from('player_transfers')
      .select('*, players(*)')
      .eq('id', transferId)
      .single();

    if (transferError) {
      console.error('Error fetching transfer details:', transferError);
      throw transferError;
    }

    // Start a transaction to handle the player transfer
    const { data: player, error: playerError } = await supabase
      .from('players')
      .update({
        team_id: transferData.to_team_id
      })
      .eq('id', transferData.player_id)
      .select()
      .single();

    if (playerError) {
      console.error('Error transferring player:', playerError);
      throw playerError;
    }

    // Update the transfer status
    const { data, error } = await supabase
      .from('player_transfers')
      .update({
        status: 'accepted' as const,
        accepted_by: acceptedById,
        updated_at: new Date().toISOString()
      })
      .eq('id', transferId)
      .select()
      .single();

    if (error) {
      console.error('Error accepting transfer:', error);
      throw error;
    }

    return {
      id: data.id,
      playerId: data.player_id,
      fromTeamId: data.from_team_id,
      toTeamId: data.to_team_id,
      transferDate: data.transfer_date,
      status: data.status as "pending" | "accepted" | "rejected",
      dataTransferOptions: data.data_transfer_options as {
        full: boolean;
        attributes: boolean;
        comments: boolean;
        objectives: boolean;
        events: boolean;
      },
      requestedBy: data.requested_by,
      acceptedBy: data.accepted_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async rejectPlayerTransfer(transferId: string): Promise<PlayerTransfer> {
    const { data, error } = await supabase
      .from('player_transfers')
      .update({
        status: 'rejected' as const,
        updated_at: new Date().toISOString()
      })
      .eq('id', transferId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting transfer:', error);
      throw error;
    }

    return {
      id: data.id,
      playerId: data.player_id,
      fromTeamId: data.from_team_id,
      toTeamId: data.to_team_id,
      transferDate: data.transfer_date,
      status: data.status as "pending" | "accepted" | "rejected",
      dataTransferOptions: data.data_transfer_options as {
        full: boolean;
        attributes: boolean;
        comments: boolean;
        objectives: boolean;
        events: boolean;
      },
      requestedBy: data.requested_by,
      acceptedBy: data.accepted_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async getTransferHistory(playerId: string): Promise<PlayerTransfer[]> {
    const { data, error } = await supabase
      .from('player_transfers')
      .select('*')
      .eq('player_id', playerId)
      .order('transfer_date', { ascending: false });

    if (error) {
      console.error('Error fetching transfer history:', error);
      throw error;
    }

    return (data || []).map(transfer => ({
      id: transfer.id,
      playerId: transfer.player_id,
      fromTeamId: transfer.from_team_id,
      toTeamId: transfer.to_team_id,
      transferDate: transfer.transfer_date,
      status: transfer.status as "pending" | "accepted" | "rejected",
      dataTransferOptions: transfer.data_transfer_options as {
        full: boolean;
        attributes: boolean;
        comments: boolean;
        objectives: boolean;
        events: boolean;
      },
      requestedBy: transfer.requested_by,
      acceptedBy: transfer.accepted_by,
      createdAt: transfer.created_at,
      updatedAt: transfer.updated_at
    }));
  },

  async recordAttributeHistory(historyData: {
    playerId: string;
    attributeName: string;
    attributeGroup: string;
    value: number;
    recordedBy: string;
  }): Promise<AttributeHistory> {
    const { data, error } = await supabase
      .from('player_attribute_history')
      .insert([{
        player_id: historyData.playerId,
        attribute_name: historyData.attributeName,
        attribute_group: historyData.attributeGroup,
        value: historyData.value,
        recorded_by: historyData.recordedBy
      }])
      .select()
      .single();

    if (error) {
      console.error('Error recording attribute history:', error);
      throw error;
    }

    return {
      id: data.id,
      playerId: data.player_id,
      attributeName: data.attribute_name,
      attributeGroup: data.attribute_group,
      value: data.value,
      recordedDate: data.recorded_date,
      recordedBy: data.recorded_by,
      createdAt: data.created_at
    };
  },

  async getAttributeHistory(playerId: string, attributeName: string): Promise<AttributeHistory[]> {
    const { data, error } = await supabase
      .from('player_attribute_history')
      .select('*')
      .eq('player_id', playerId)
      .eq('attribute_name', attributeName)
      .order('recorded_date', { ascending: true });

    if (error) {
      console.error('Error fetching attribute history:', error);
      throw error;
    }

    return (data || []).map(history => ({
      id: history.id,
      playerId: history.player_id,
      attributeName: history.attribute_name,
      attributeGroup: history.attribute_group,
      value: history.value,
      recordedDate: history.recorded_date,
      recordedBy: history.recorded_by,
      createdAt: history.created_at
    }));
  }
};
