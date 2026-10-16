import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { AscSessionConfig, DEFAULT_ASC_CONFIG } from './applicationReview';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'ascConfig.json');

/**
 * Retrieves the currently configured ASC session details from the database (Settings model).
 * Falls back to local JSON or DEFAULT_ASC_CONFIG if no custom configuration has been saved yet.
 */
export async function getStoredAscConfig(): Promise<AscSessionConfig> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
      select: { ascConfig: true },
    });

    if (settings?.ascConfig) {
      const parsed = typeof settings.ascConfig === 'string'
        ? JSON.parse(settings.ascConfig)
        : settings.ascConfig;
      return {
        ...DEFAULT_ASC_CONFIG,
        ...parsed,
      };
    }

    // Auto-migrate from JSON file to DB if present
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      const migratedConfig: AscSessionConfig = {
        ...DEFAULT_ASC_CONFIG,
        ...parsed,
      };

      await prisma.settings.update({
        where: { id: 'default' },
        data: { ascConfig: migratedConfig as unknown as Prisma.InputJsonValue },
      }).catch((e) => console.warn('Could not auto-migrate ascConfig.json to DB:', e));

      return migratedConfig;
    }
  } catch (err) {
    console.error('Failed to read ASC config from DB, using fallback:', err);
  }

  return DEFAULT_ASC_CONFIG;
}

/**
 * Saves updated ASC session configuration to the database (Settings model).
 */
export async function saveStoredAscConfig(config: AscSessionConfig): Promise<boolean> {
  try {
    await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        ascConfig: config as unknown as Prisma.InputJsonValue,
      },
      create: {
        id: 'default',
        deadline: new Date('2026-12-15T15:21:22.590Z'),
        cohortYear: 2027,
        cycleLabel: 'Saathi Teachers Programme (STP) 2027',
        ascConfig: config as unknown as Prisma.InputJsonValue,
      },
    });

    // Mirror to local JSON for filesystem cache/offline fallback
    try {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch {
      // Non-fatal if filesystem is read-only in production
    }

    return true;
  } catch (err) {
    console.error('Failed to save ASC config to database:', err);
    return false;
  }
}
