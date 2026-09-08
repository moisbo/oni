<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { getEntityIcon, getEntityUrl } from '@/lib/tools';
import type { ApiService, EntityType } from '@/services/api';

const DEFAULT_PAGE_SIZE = 10;

const props = withDefaults(
  defineProps<{
    lookups: Array<{
      targetIds: string[];
      relationshipFields?: string[];
      mode?: 'filter' | 'direct';
      entityTypes?: string[];
      limit?: number;
    }>;
    title?: string;
    emptyText?: string;
    excludeEntityId?: string;
    limit?: number;
    pageSize?: number;
  }>(),
  {
    title: 'Related entities',
    emptyText: 'No related items found.',
    excludeEntityId: undefined,
    pageSize: DEFAULT_PAGE_SIZE,
  },
);

const api = inject<ApiService>('api');
if (!api) {
  throw new Error('API instance not provided');
}

const relatedItems = ref<EntityType[]>([]);
const isLoading = ref(false);
const errorText = ref<string>();
const currentPage = ref(1);
const totalItems = ref(0);

const normalizedLookups = computed(() => {
  return props.lookups
    .map((lookup) => ({
      ...lookup,
      mode: lookup.mode ?? 'filter',
      targetIds: Array.from(new Set(lookup.targetIds.map((value) => value.trim()).filter(Boolean))),
      relationshipFields: (lookup.relationshipFields ?? []).map((field) => field.trim()).filter(Boolean),
    }))
    .filter(
      (lookup) => lookup.targetIds.length > 0 && (lookup.mode === 'direct' || lookup.relationshipFields.length > 0),
    );
});

const loadRelatedItems = async () => {
  const lookups = normalizedLookups.value;

  relatedItems.value = [];
  totalItems.value = 0;
  errorText.value = undefined;

  if (lookups.length === 0) {
    return;
  }

  isLoading.value = true;

  try {
    const filterLookups = lookups.filter((lookup) => lookup.mode !== 'direct');
    const directLookups = lookups.filter((lookup) => lookup.mode === 'direct');

    const searchRequests = filterLookups.flatMap((lookup) =>
      lookup.relationshipFields.map((field) => ({
        query: '',
        searchType: 'basic' as const,
        filters: {
          [field]: lookup.targetIds,
          ...(lookup.entityTypes?.length ? { entityType: lookup.entityTypes } : {}),
        },
        limit: lookup.limit ?? props.limit ?? props.pageSize,
        offset: (currentPage.value - 1) * (lookup.limit ?? props.limit ?? props.pageSize),
        sort: 'relevance',
        order: 'desc',
      })),
    );

    const [searchResults, directResultsByLookup] = await Promise.all([
      Promise.all(searchRequests.map((params) => api.search(params))),
      Promise.all(
        directLookups.map(async (lookup) => ({
          lookup,
          entities: await Promise.all(lookup.targetIds.map((id) => api.getEntity(id))),
        })),
      ),
    ]);

    const failed = searchResults.find((result) => 'error' in result);
    if (failed && 'error' in failed) {
      errorText.value = failed.error;
      return;
    }

    const byId = new Map<string, EntityType>();
    totalItems.value = searchResults.reduce((total, result) => ('error' in result ? total : total + result.total), 0);

    searchResults.forEach((result) => {
      if ('error' in result) {
        return;
      }

      result.entities.forEach((item) => {
        if (item.id === props.excludeEntityId) {
          return;
        }

        byId.set(item.id, item);
      });
    });

    directResultsByLookup.forEach(({ lookup, entities }) => {
      entities.forEach((result) => {
        if ('error' in result) {
          return;
        }

        const item = result.entity;

        if (item.id === props.excludeEntityId) {
          return;
        }

        if (lookup.entityTypes?.length && !lookup.entityTypes.includes(item.entityType)) {
          return;
        }

        if (!byId.has(item.id)) {
          totalItems.value += 1;
        }

        byId.set(item.id, item);
      });
    });

    relatedItems.value = Array.from(byId.values());
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : 'Failed to fetch related items';
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => [JSON.stringify(props.lookups), props.excludeEntityId, props.limit, props.pageSize],
  () => {
    currentPage.value = 1;
    loadRelatedItems();
  },
  { immediate: true },
);
</script>

<template>
  <div class="my-4">
    <div class="font-semibold mb-3">{{ title }}</div>

    <div v-if="isLoading" class="text-gray-600">Loading related items...</div>
    <div v-else-if="errorText" class="text-red-700">{{ errorText }}</div>
    <div v-else-if="!relatedItems.length" class="text-gray-600">{{ emptyText }}</div>
    <div v-else class="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
      <router-link
        v-for="related of relatedItems"
        :key="related.id"
        :to="getEntityUrl(related)"
        class="flex flex-col min-h-[9rem] rounded-lg border border-gray-200 bg-white p-2 shadow-sm no-underline text-inherit transition hover:shadow-md hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div class="flex-1 flex items-center justify-center text-gray-700 min-h-0 py-2">
          <el-icon :size="56"><component :is="getEntityIcon(related)" /></el-icon>
        </div>
        <div class="font-medium text-gray-900 line-clamp-3 break-words mt-2">
          {{ related.name || related.id }}
        </div>
      </router-link>
    </div>
    <el-pagination
      v-if="totalItems > (props.pageSize ?? DEFAULT_PAGE_SIZE)"
      v-model:current-page="currentPage"
      :page-size="props.pageSize ?? DEFAULT_PAGE_SIZE"
      :total="totalItems"
      layout="prev, pager, next"
      class="mt-4 justify-center"
      @current-change="loadRelatedItems"
    />
  </div>
</template>
