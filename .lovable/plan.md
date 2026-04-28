# Fix "failed to load coaching kit data" + collapsible team sections

## Root cause

`user_teams.team_id` has **two foreign keys** pointing at `teams.id` (`fk_user_teams_team_id` and `user_teams_team_id_fkey`). PostgREST can't resolve `teams!inner(id, name)` and throws an "ambiguous relationship" error, which surfaces as the toast "Failed to load coaching kit data".

This is also the source of the React "two children with the same key" warning — the second key would be the duplicate fallback render after the failed load.

## Fix

In `src/components/staff/StaffKitSection.tsx`:

1. **Drop the embed.** Replace the `user_teams` query with a plain select of `team_id, role`, then fetch the missing team names in a separate query against `teams` filtered by the collected ids.

2. **Make each team section collapsible.** Wrap each per-team block in a shadcn `Collapsible`:
   - Header row stays visible (team name, role, chevron).
   - Body (kit sizes + issued list) collapses.
   - First card open by default; the rest collapsed.
   - Track open state in a `Record<string, boolean>` keyed by `record.id`.

No DB changes. No other files affected.

## Technical details

```ts
// Replacement query
const { data: userTeamsData, error } = await supabase
  .from('user_teams')
  .select('team_id, role')
  .eq('user_id', userId)
  .in('role', STAFF_ROLES);

const missingTeamIds = [...new Set(
  (userTeamsData ?? [])
    .map(ut => ut.team_id)
    .filter(id => !coveredTeamIds.has(id))
)];

const { data: teamsData } = await supabase
  .from('teams').select('id, name').in('id', missingTeamIds);

const teamNamesById = new Map(teamsData?.map(t => [t.id, t.name]) ?? []);
```

Collapsible structure per record:
```tsx
<Collapsible open={openMap[record.id]} onOpenChange={(o) => setOpenMap(s => ({...s, [record.id]: o}))}>
  <CollapsibleTrigger className="flex w-full items-center justify-between ...">
    <div>
      <h4>{record.team_name}</h4>
      <p className="text-sm text-muted-foreground">{record.role}</p>
    </div>
    <ChevronDown className={cn("transition", openMap[record.id] && "rotate-180")} />
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* existing kit sizes + issued kit blocks */}
  </CollapsibleContent>
</Collapsible>
```
