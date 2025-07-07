
import { useDroppable } from '@dnd-kit/core';
import { PlayerIcon } from './PlayerIcon';
import { SquadPlayer } from '@/types/teamSelection';

interface SubstituteBenchProps {
  id: string;
  substitutes: SquadPlayer[];
  globalCaptainId?: string;
  nameDisplayOption?: 'surname' | 'first' | 'full' | 'initials';
}

export const SubstituteBench: React.FC<SubstituteBenchProps> = ({
  id,
  substitutes,
  globalCaptainId,
  nameDisplayOption = 'surname'
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  const periodId = id.replace('substitutes-', '');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-slate-700">Substitutes</h4>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent"></div>
      </div>
      
      <div
        ref={setNodeRef}
        className={`
          flex flex-wrap gap-3 p-4 rounded-xl border-2 border-dashed min-h-[100px]
          transition-all duration-300 ease-out
          ${isOver 
            ? 'border-solid border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 ring-4 ring-amber-400 ring-opacity-30 scale-[1.02] shadow-lg' 
            : 'border-slate-300 bg-gradient-to-r from-slate-50 to-slate-100 hover:border-slate-400 hover:from-slate-100 hover:to-slate-200'
          }
        `}
      >
        {substitutes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-medium">
            <div className="text-center">
              <div className="text-2xl mb-2">⚽</div>
              <div>Drag players here to make them substitutes</div>
            </div>
          </div>
        ) : (
          substitutes.map((player) => (
            <div key={player.id} className="relative">
              <PlayerIcon
                player={player}
                isCaptain={player.id === globalCaptainId}
                nameDisplayOption={nameDisplayOption}
                isCircular={true}
                dragId={`${periodId}|substitutes|${player.id}`}
              />
              {/* Substitute indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-xs font-bold text-amber-900">S</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
