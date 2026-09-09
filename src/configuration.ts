import { z } from 'zod/v4';

const helpSchema = z.strictObject({
  aboutText: z.string(),
  citationText: z.string(),
});

const subHelpLinkSchema = z.strictObject({
  name: z.string(),
  href: z.url(),
  target: z.string(),
});

const termsAndPrivacySchema = z.strictObject({
  text: z.string(),
  href: z.string(),
  title: z.string(),
});

const footerSchema = z.strictObject({
  copyright: z.string(),
  link: z.strictObject({
    href: z.url(),
    text: z.string(),
  }),
});

const topNavItemSchema = z.strictObject({
  route: z.string(),
  display: z.string(),
});

const valueLabelSchema = z.strictObject({
  value: z.string(),
  label: z.string(),
});

const fieldLabelSchema = z.strictObject({
  field: z.string(),
  label: z.string(),
});

const searchSchema = z
  .strictObject({
    sorting: z.array(valueLabelSchema),
    default: z.object({
      sorting: z.string(),
      ordering: z.enum(['asc', 'desc']),
    }),
    searchDetails: z.array(fieldLabelSchema),
  })
  .refine((data) => data.sorting.map((s) => s.value).includes(data.default.sorting), {
    message: 'default sorting must be one of the values in sorting array',
    path: ['defailt.sorting'], // This will attach the error to the role field
  })
  .optional();

const fieldDisplaySchema = z.strictObject({
  display: z.string(),
  name: z.string(),
});

const filterMetaSchema = z.strictObject({
  mode: z.literal('filter').optional().default('filter'),
  top: z.array(fieldDisplaySchema).optional().default([]),
  hide: z.array(z.string()),
});

const explicitMetaSchema = z.strictObject({
  mode: z.literal('explicit'),
  show: z.array(z.string()),
});

const metaSchema = z.union([filterMetaSchema, explicitMetaSchema]);

const relationshipFinderTargetSchema = z.union([
  z.strictObject({
    source: z.literal('entityId'),
  }),
  z.strictObject({
    source: z.literal('entityField'),
    field: z.string(),
  }),
  z.strictObject({
    source: z.literal('metadataField'),
    field: z.string(),
  }),
]);

const relationshipLookupSchema = z
  .strictObject({
    // 'filter' searches other entities whose relationshipFields match the target ids;
    // 'direct' fetches the target ids themselves as entities (e.g. a referenced Person).
    mode: z.enum(['filter', 'direct']).optional().default('filter'),
    relationshipFields: z.array(z.string()).optional(),
    target: relationshipFinderTargetSchema.optional().default({ source: 'entityId' }),
    entityTypes: z.array(z.string()).optional(),
    limit: z.number().int().positive().optional(),
  })
  .refine((data) => data.mode === 'direct' || (data.relationshipFields?.length ?? 0) > 0, {
    message: 'relationshipFields is required when mode is "filter"',
    path: ['relationshipFields'],
  });

const relationshipFinderSchema = z.strictObject({
  title: z.string(),
  lookups: z.array(relationshipLookupSchema).nonempty(),
  emptyText: z.string().optional(),
  excludeCurrentEntity: z.boolean().optional().default(false),
  limit: z.number().int().positive().optional(),
});

const entityViewSchema = z.strictObject({
  meta: metaSchema,
  memberSort: z.string().optional().default('name'),
  relationships: z.array(relationshipFinderSchema).optional().default([]),
});

const entityViewOverrideSchema = z.strictObject({
  meta: metaSchema.optional(),
  memberSort: z.string().optional(),
  relationships: z.array(relationshipFinderSchema).optional(),
});

const collectionSchema = entityViewSchema;

const objectSchema = entityViewSchema;

export type CollectionConfig = z.infer<typeof collectionSchema>;
export type ObjectConfig = z.infer<typeof objectSchema>;

const fileSchema = entityViewSchema;

export type FileConfig = z.infer<typeof fileSchema>;

const splashSchema = z.strictObject({
  text: z.string(),
  textClass: z.string(),
  image: z.string(),
  enabled: z.boolean(),
  launcher: z.string(),
});

const homeSchema = z.strictObject({
  enabled: z.boolean().default(true),
  hero: z.strictObject({
    title: z.string(),
    subtitle: z.string().optional(),
    backgroundImage: z.string().optional(),
    backgroundClass: z.string().optional(),
  }),
  content: z.string().optional(),
});

// Sensible fallbacks covering Australia and the near Pacific, applied when a
// config omits mapConfig (or individual fields) entirely.
const defaultBoundingBox = {
  topRight: { lat: 0, lng: 180 },
  bottomLeft: { lat: -50, lng: 110 },
};
const defaultZoom = 3;

const mapSchema = z.strictObject({
  boundingBox: z
    .strictObject({
      topRight: z.strictObject({ lat: z.number(), lng: z.number() }),
      bottomLeft: z.strictObject({ lat: z.number(), lng: z.number() }),
    })
    .default(defaultBoundingBox),
  zoom: z.number().default(defaultZoom),
});

const aggregationSchema = z.strictObject({
  display: z.string(),
  name: z.string(),
  help: z.string().optional(),
  type: z.enum(['standard', 'date_histogram']).optional().default('standard'),
  active: z.boolean().optional().default(false),
});

// Facet definitions as authored: type and active may be omitted — consumers
// treat absence as a standard, collapsed facet.
export type AggregationInput = z.input<typeof aggregationSchema>;

const citeData = z.strictObject({
  help: z.strictObject({
    text: z.string(),
  }),
});

const defaultPageSizes = [10, 25, 50, 100] as const;

const paginationSchema = z
  .strictObject({
    pageSizes: z.array(z.number()).default([...defaultPageSizes]),
  })
  .optional()
  .default({ pageSizes: [...defaultPageSizes] });

const localeCodeSchema = z
  .string()
  .trim()
  .min(2)
  .regex(/^[a-z][a-z0-9-]*$/i, 'locale code must start with a letter and contain only letters, numbers, or hyphens');

const uiSchema = z.strictObject({
  urlPrefix: z.string().startsWith('/').optional().default(''),
  management: z
    .strictObject({
      editUrl: z.string().optional(),
    })
    .optional()
    .default({}),
  title: z.string(),
  shortTitle: z.string().optional(),
  splash: splashSchema.optional(),
  home: homeSchema.optional(),
  logoFilename: z.string().optional(),
  showEllipsis: z.boolean().optional(),
  navHeight: z.string().optional(),
  help: helpSchema,
  subHelpLinks: z.array(subHelpLinkSchema).default([]),
  citeData: citeData,
  takedown: z.url(),
  terms: termsAndPrivacySchema.optional(),
  privacy: termsAndPrivacySchema.optional(),
  footer: footerSchema,
  login: z.strictObject({
    enabled: z.boolean(),
    manageTermsAndConditions: z.boolean(),
  }),
  topNavItems: z.array(topNavItemSchema).optional(),
  topNavHome: z.string().optional(),
  search: searchSchema,
  main: z.strictObject({
    byteFields: z.array(z.string()).optional(),
    durationFields: z.array(z.string()).optional(),
    expand: z.array(z.string()),
    paginatedMeta: z.array(z.string()).optional().default([]),
  }),
  metadataMapping: z
    .strictObject({
      mappingFile: z.string().optional(),
      textReplacements: z.record(z.string(), z.string()).optional().default({}),
    })
    .optional(),
  head: z.strictObject({
    title: z.string(),
    meta: z.array(z.strictObject({ name: z.string(), content: z.string() })),
  }),
  collection: collectionSchema,
  object: objectSchema,
  person: entityViewOverrideSchema.optional(),
  file: fileSchema,
  // Omitted entirely means "show every facet the API declares in GET
  // /capabilities"; an empty array means "show no facets". Configure only to
  // curate, rename, reorder, or use date_histogram facets.
  aggregations: z.array(aggregationSchema).optional(),
  searchFields: z.record(z.string(), z.string()),
  analytics: z
    .strictObject({
      gaMeasurementId: z.string(),
    })
    .optional(),
  sentry: z
    .strictObject({
      dsn: z.url(),
      environment: z.string().optional(),
      tracesSampleRate: z.number().min(0).max(1).optional(),
      replaysSessionSampleRate: z.number().min(0).max(1).optional(),
      replaysOnErrorSampleRate: z.number().min(0).max(1).optional(),
    })
    .optional(),
  mapConfig: mapSchema.optional().default({ boundingBox: defaultBoundingBox, zoom: defaultZoom }),
  presentation: z
    .strictObject({
      errorPageImage: z.union([z.boolean(), z.string()]).optional(),
      fileVisibilityField: z.union([z.string(), z.array(z.string()), z.boolean()]).optional(),
      preferredPhotoField: z.string().optional(),
    })
    .optional(),
  features: z
    .strictObject({
      hasZipDownload: z.boolean().optional(),
      hasAnnouncements: z.boolean().optional(),
      disableMaps: z.boolean().optional(),
    })
    .optional(),
  pagination: paginationSchema,
  i18n: z
    .strictObject({
      availableLocales: z.array(localeCodeSchema).nonempty().default(['en']),
      defaultLocale: localeCodeSchema.default('en'),
    })
    .refine((data) => data.availableLocales.includes(data.defaultLocale), {
      message: 'defaultLocale must be one of availableLocales',
      path: ['defaultLocale'],
    })
    .optional()
    .default({ availableLocales: ['en'], defaultLocale: 'en' }),
});

const apiSchema = z.strictObject({
  rocrate: z.strictObject({
    endpoint: z.string().optional().default('').or(z.literal('')),
    usesRedirects: z.boolean().optional(),
  }),
  oidc: z
    .strictObject({
      endpoint: z.string().optional(),
      clientId: z.string().optional(),
      scope: z.string().optional(),
    })
    .optional(),
});

const configurationSchema = z.strictObject({
  ui: uiSchema,
  api: apiSchema,
});

const loadConfig = async () => {
  try {
    const response = await fetch(import.meta.env.VITE_ONI_CONFIG_PATH || '/configuration.json');

    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown;

    return data;
  } catch (error) {
    console.error('Config loading error:', error);
    throw error;
  }
};

const configurationJSON = await loadConfig();
const configuration = configurationSchema.parse(configurationJSON);
export const ui = configuration.ui;
export const api = configuration.api;
// biome-ignore lint/style/noNonNullAssertion: pageSizes is guaranteed non-empty by Zod defaults
export const defaultPageSize = ui.pagination.pageSizes[0]!;

export type RelationshipLookupConfig = z.infer<typeof relationshipLookupSchema>;
export type RelationshipFinderConfig = z.infer<typeof relationshipFinderSchema>;

// ui.person is an override on top of ui.object; pre-merge it here so views don't
// need to repeat the merge/fallback logic or re-annotate the result as ObjectConfig.
export const personConfig: ObjectConfig = {
  meta: ui.person?.meta ?? ui.object.meta,
  memberSort: ui.person?.memberSort ?? ui.object.memberSort,
  relationships: ui.person?.relationships ?? ui.object.relationships,
};
