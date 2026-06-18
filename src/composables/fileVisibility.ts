const DEFAULT_FILE_VISIBILITY_FIELD = 'display';
const DEFAULT_PREFERRED_PHOTO_FIELD = 'image';

type FileVisibilitySetting = string | string[] | boolean | undefined;

export const resolveFileVisibilityConfig = (setting: FileVisibilitySetting) => {
  const fields =
    typeof setting === 'string'
      ? setting.trim().length > 0
        ? [setting]
        : []
      : Array.isArray(setting)
        ? setting.filter((field) => typeof field === 'string' && field.trim().length > 0)
        : [];

  return {
    fields: fields.length > 0 ? fields : [DEFAULT_FILE_VISIBILITY_FIELD],
    enabled: setting !== false,
  };
};

export const resolvePreferredPhotoField = (setting: string | undefined) => {
  if (typeof setting !== 'string' || setting.trim().length === 0) {
    return DEFAULT_PREFERRED_PHOTO_FIELD;
  }

  return setting;
};

const toVisibilityFlag = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toVisibilityFlag(item);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
};

export const isFileVisibleByMetadata = (
  metadataRecord: Record<string, unknown>,
  fileVisibility: ReturnType<typeof resolveFileVisibilityConfig>,
) => {
  if (!fileVisibility.enabled) {
    return true;
  }

  for (const field of fileVisibility.fields) {
    if (toVisibilityFlag(metadataRecord[field]) === false) {
      return false;
    }
  }

  return true;
};
