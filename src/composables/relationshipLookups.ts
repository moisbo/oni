import type { Ref } from 'vue';
import type { RelationshipFinderConfig, RelationshipLookupConfig } from '@/configuration';
import { extractStringValuesAtPath } from '@/lib/tools';
import type { EntityType } from '@/services/api';

export function useRelationshipLookups(entity: Ref<EntityType | undefined>, metadata: Ref<unknown>) {
  const resolveTargetIds = (lookup: RelationshipLookupConfig) => {
    if (lookup.target.source === 'entityId') {
      if (!entity.value?.id) {
        return [];
      }

      // Other entities reference this one by its crate-local id (e.g. `ldac:speaker.@id`),
      // which doesn't have the `collectionIdentifier/` prefix the API adds to `entity.id`.
      const collectionIdentifier = entity.value.identifiers?.collectionIdentifier;
      const localId =
        collectionIdentifier && entity.value.id.startsWith(`${collectionIdentifier}/`)
          ? entity.value.id.slice(collectionIdentifier.length + 1)
          : undefined;

      return localId ? [entity.value.id, localId] : [entity.value.id];
    }

    if (lookup.target.source === 'entityField') {
      return entity.value ? extractStringValuesAtPath(entity.value, lookup.target.field) : [];
    }

    return metadata.value ? extractStringValuesAtPath(metadata.value, lookup.target.field) : [];
  };

  const resolveRelationshipLookups = (relationship: RelationshipFinderConfig) => {
    return relationship.lookups.map((lookup) => ({
      mode: lookup.mode,
      targetIds: resolveTargetIds(lookup),
      relationshipFields: lookup.relationshipFields,
      entityTypes: lookup.entityTypes,
      limit: lookup.limit,
    }));
  };

  return { resolveRelationshipLookups };
}
