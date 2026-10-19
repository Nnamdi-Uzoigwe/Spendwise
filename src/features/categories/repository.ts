import { getDatabase } from '../../database/db';

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  iconKey: string;
}

export async function listCategories(type?: CategoryType): Promise<Category[]> {
  const db = await getDatabase();
  const rows = type
    ? await db.getAllAsync<{
        id: string; name: string; type: CategoryType; icon_key: string;
      }>(
        `SELECT id, name, type, icon_key FROM categories WHERE type = ? ORDER BY name COLLATE NOCASE ASC`,
        type,
      )
    : await db.getAllAsync<{
        id: string; name: string; type: CategoryType; icon_key: string;
      }>(
        `SELECT id, name, type, icon_key FROM categories ORDER BY type, name COLLATE NOCASE ASC`,
      );
  return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, iconKey: r.icon_key }));
}