import { Player, Parent, PlayerTransfer, AttributeHistory, KitSizes } from '@/types';

const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'John Smith',
    dateOfBirth: '2010-05-15',
    squadNumber: 10,
    type: 'outfield',
    team_id: 'team1',
    availability: 'green',
    subscriptionType: 'full_squad',
    attributes: [],
    objectives: [],
    comments: [],
    kit_sizes: { nameOnShirt: 'SMITH' },
    matchStats: {
      totalGames: 12,
      totalMinutes: 880,
      captainGames: 3,
      playerOfTheMatchCount: 2,
      minutesByPosition: { 'MC': 500, 'AMC': 380 },
      recentGames: []
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

export const playersService = {
  async getPlayersByTeamId(teamId: string): Promise<Player[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPlayers.filter(player => player.team_id === teamId);
  },

  async getActivePlayersByTeamId(teamId: string): Promise<Player[]> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPlayers.filter(player => 
      player.team_id === teamId && !player.leaveDate
    );
  },

  async createPlayer(playerData: Partial<Player>): Promise<Player> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name: playerData.name || '',
      dateOfBirth: playerData.dateOfBirth,
      squadNumber: playerData.squadNumber || 0,
      type: playerData.type || 'outfield',
      team_id: playerData.team_id || '',
      availability: playerData.availability || 'green',
      subscriptionType: playerData.subscriptionType || 'full_squad',
      attributes: [],
      objectives: [],
      comments: [],
      kit_sizes: playerData.kit_sizes || {},
      matchStats: {
        totalGames: 0,
        totalMinutes: 0,
        captainGames: 0,
        playerOfTheMatchCount: 0,
        minutesByPosition: {},
        recentGames: []
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockPlayers.push(newPlayer);
    return newPlayer;
  },

  async getAllPlayers(): Promise<Player[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPlayers;
  },

  async getInactivePlayers(teamId: string): Promise<Player[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockPlayers.filter(player => 
      player.team_id === teamId && player.leaveDate
    );
  },

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const playerIndex = mockPlayers.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    // Handle database field mappings
    const dbUpdates: any = { ...updates };
    if (updates.team_id) {
      dbUpdates.team_id = updates.team_id;
    }
    if (updates.subscriptionStatus) {
      dbUpdates.subscription_status = updates.subscriptionStatus;
    }
    if (updates.status) {
      dbUpdates.status = updates.status;
    }
    if (updates.leaveDate) {
      dbUpdates.leave_date = updates.leaveDate;
    }
    if (updates.objectives) {
      dbUpdates.objectives = updates.objectives;
    }
    if (updates.comments) {
      dbUpdates.comments = updates.comments;
    }

    mockPlayers[playerIndex] = {
      ...mockPlayers[playerIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    return mockPlayers[playerIndex];
  },

  async deletePlayer(playerId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const playerIndex = mockPlayers.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    mockPlayers.splice(playerIndex, 1);
  },

  async getParentsByPlayerId(playerId: string): Promise<Parent[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
      {
        id: `parent-${playerId}`,
        name: 'Parent Name',
        email: 'parent@example.com',
        phone: '123-456-7890',
        playerId,
        linkCode: 'ABC123',
        subscriptionType: 'full_squad',
        subscriptionStatus: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  },

  async createParent(parentData: Partial<Parent>): Promise<Parent> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newParent: Parent = {
      id: `parent-${Date.now()}`,
      name: parentData.name || '',
      email: parentData.email || '',
      phone: parentData.phone,
      playerId: parentData.playerId || '',
      linkCode: `LINK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      subscriptionType: parentData.subscriptionType || 'full_squad',
      subscriptionStatus: parentData.subscriptionStatus || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return newParent;
  },

  async updateParent(parentId: string, updates: Partial<Parent>): Promise<Parent> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock update - in real implementation, this would update the database
    return {
      id: parentId,
      name: updates.name || 'Updated Parent',
      email: updates.email || 'updated@example.com',
      phone: updates.phone,
      playerId: updates.playerId || '',
      linkCode: 'UPDATED123',
      subscriptionType: updates.subscriptionType || 'full_squad',
      subscriptionStatus: updates.subscriptionStatus || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  async deleteParent(parentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Mock deletion
  },

  async regenerateParentLinkCode(parentId: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newLinkCode = `LINK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    return newLinkCode;
  },

  async getTransferHistory(playerId: string): Promise<PlayerTransfer[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
      {
        id: `transfer-${playerId}`,
        playerId,
        fromTeamId: 'old-team',
        toTeamId: 'new-team',
        transferDate: '2024-01-15',
        status: 'accepted',
        dataTransferOptions: {
          full: true,
          attributes: true,
          comments: true,
          objectives: true,
          events: true
        },
        requestedBy: 'manager-id',
        acceptedBy: 'admin-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  },

  async getAttributeHistory(playerId: string, attributeName: string): Promise<AttributeHistory[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
      {
        id: `attr-history-${playerId}`,
        playerId,
        attributeName,
        attributeGroup: 'technical',
        value: 7,
        recordedDate: '2024-01-15',
        recordedBy: 'coach-id',
        createdAt: new Date().toISOString()
      }
    ];
  }
};
