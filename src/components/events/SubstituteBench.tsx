
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer } from '@/types/teamSelection';

interface SubstituteBenchProps {
  periodId: string;
  substitutes: SquadPlayer[];
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
}

export const SubstituteBench: React.FC<SubstituteBenchProps> = ({
  periodId,
  substitutes,
  globalCaptainId,
  nameDisplayOption = 'surname'
}) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Substitutes</h4>
      <Droppable droppableId={`substitutes-${periodId}`} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-wrap gap-2 p-3 rounded-lg border-2 border-dashed min-h-[100px] ${
              snapshot.isDraggingOver ? 'border-primary bg-primary/15' : 'border-gray-300 bg-gray-50'
            }`}
          >
            {substitutes.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Drag players here to make them substitutes
              </div>
            ) : (
              substitutes.map((player, index) => (
                <Draggable key={player.id} draggableId={player.id} index={index}>
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
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
