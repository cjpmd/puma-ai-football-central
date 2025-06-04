
import { DataRecoveryPanel } from '@/components/events/DataRecoveryPanel';

const DataRecovery = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Recovery</h1>
          <p className="text-muted-foreground">
            Search for and restore lost event selections and player data.
          </p>
        </div>
        
        <DataRecoveryPanel />
      </div>
    </div>
  );
};

export default DataRecovery;
