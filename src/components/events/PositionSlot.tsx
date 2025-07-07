import { Droppable, Draggable } from 'react-beautiful-dnd';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer, PositionSlot as PositionSlotType } from '@/types/teamSelection';

interface PositionSlotProps {
  periodId: string;
  positions: PositionSlotType[];
  squadPlayers: SquadPlayer[];
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
}

export const PositionSlot: React.FC<PositionSlotProps> = ({
  periodId,
  positions,
  squadPlayers,
  globalCaptainId,
  nameDisplayOption = 'surname'
}) => {
  return (
    <Droppable droppableId={periodId}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="relative bg-green-100 rounded-lg p-4 h-[350px] print:h-[300px]"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-green-200 to-green-300 rounded-lg opacity-30" />
          
          {/* Field markings */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white rounded-full opacity-50" />
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white opacity-50" />
          <div className="absolute top-2 left-1/4 right-1/4 h-10 border-l-2 border-r-2 border-white opacity-50" />
          <div className="absolute bottom-2 left-1/4 right-1/4 h-10 border-l-2 border-r-2 border-white opacity-50" />
          
          <div className="relative h-full">
            {positions.map((position, index) => {
              const player = position.playerId ? squadPlayers.find(p => p.id === position.playerId) : undefined;
              
              return (
                <div
                  key={`position-${index}`}
                  className="absolute"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {player ? (
                    <Draggable draggableId={player.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'opacity-50' : ''}
                        >
                          <PlayerIcon 
                            player={player} 
                            isCaptain={player.id === globalCaptainId}
                            nameDisplayOption={nameDisplayOption}
                            isCircular={true}
                            positionAbbreviation={position.abbreviation}
                            showPositionLabel={true}
                            isLarger={true}
                          />
                        </div>
                      )}
                    </Draggable>
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-400 bg-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-600">{position.abbreviation}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {position.positionName.split(' ').map(word => word.slice(0, 3)).join(' ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};