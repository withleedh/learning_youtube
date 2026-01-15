/**
 * Expression Database - JSON 기반 표현 DB
 * 중복 방지 및 표현 관리를 위한 데이터베이스
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import type { ComparisonCategory, Difficulty } from './types';

// Expression record schema
export const expressionRecordSchema = z.object({
  expression: z.string().min(1),
  category: z.enum(['daily', 'business', 'emotion', 'request_reject', 'apology_thanks']),
  difficulty: z.enum(['A2', 'B1', 'B2', 'C1']),
  videoId: z.string().min(1),
  usedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
});

// Database schema
export const expressionDatabaseSchema = z.object({
  expressions: z.array(expressionRecordSchema),
  blacklist: z.array(z.string()),
  lastUpdated: z.string(),
});

// TypeScript types
export type ExpressionRecord = z.infer<typeof expressionRecordSchema>;
export type ExpressionDatabaseData = z.infer<typeof expressionDatabaseSchema>;

// Input type for adding expressions (without videoId and usedAt which are set by the method)
export interface AddExpressionInput {
  expression: string;
  category: ComparisonCategory;
  difficulty: Difficulty;
}

/**
 * Expression Database class - manages expression history and blacklist
 */
export class ExpressionDatabase {
  private dbPath: string;
  private data: ExpressionDatabaseData;
  private loaded: boolean = false;

  constructor(outputDir: string, channelId: string) {
    this.dbPath = path.join(outputDir, channelId, 'expression-db.json');
    this.data = {
      expressions: [],
      blacklist: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Ensure database is loaded
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }
  }

  /**
   * Load database from file
   */
  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.dbPath, 'utf-8');
      const parsed = JSON.parse(content);
      const validated = expressionDatabaseSchema.safeParse(parsed);

      if (validated.success) {
        this.data = validated.data;
      } else {
        console.warn('Invalid database format, starting fresh');
        this.data = {
          expressions: [],
          blacklist: [],
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error) {
      // File doesn't exist or can't be read, start with empty database
      this.data = {
        expressions: [],
        blacklist: [],
        lastUpdated: new Date().toISOString(),
      };
    }
    this.loaded = true;
  }

  /**
   * Save database to file
   */
  async save(): Promise<void> {
    this.data.lastUpdated = new Date().toISOString();

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  /**
   * Add expression to database
   * @param input Expression data to add
   * @param videoId Video ID where expression was used
   */
  async addExpression(input: AddExpressionInput, videoId: string): Promise<void> {
    await this.ensureLoaded();

    const record: ExpressionRecord = {
      expression: input.expression,
      category: input.category,
      difficulty: input.difficulty,
      videoId,
      usedAt: new Date().toISOString().split('T')[0],
    };

    // Validate record
    const validated = expressionRecordSchema.safeParse(record);
    if (!validated.success) {
      throw new Error(`Invalid expression record: ${validated.error.message}`);
    }

    this.data.expressions.push(validated.data);
    await this.save();
  }

  /**
   * Add multiple expressions at once
   */
  async addExpressions(inputs: AddExpressionInput[], videoId: string): Promise<void> {
    await this.ensureLoaded();

    const today = new Date().toISOString().split('T')[0];

    for (const input of inputs) {
      const record: ExpressionRecord = {
        expression: input.expression,
        category: input.category,
        difficulty: input.difficulty,
        videoId,
        usedAt: today,
      };

      const validated = expressionRecordSchema.safeParse(record);
      if (validated.success) {
        this.data.expressions.push(validated.data);
      }
    }

    await this.save();
  }

  /**
   * Get expressions used in the last N videos
   * @param videoCount Number of recent videos to check
   * @returns Array of expression strings
   */
  async getRecentExpressions(videoCount: number): Promise<string[]> {
    await this.ensureLoaded();

    if (videoCount <= 0) {
      return [];
    }

    // Get unique video IDs sorted by most recent usage
    const videoUsage = new Map<string, string>(); // videoId -> latest usedAt

    for (const record of this.data.expressions) {
      const existing = videoUsage.get(record.videoId);
      if (!existing || record.usedAt > existing) {
        videoUsage.set(record.videoId, record.usedAt);
      }
    }

    // Sort videos by date (most recent first) and take N
    const recentVideoIds = Array.from(videoUsage.entries())
      .sort((a, b) => b[1].localeCompare(a[1]))
      .slice(0, videoCount)
      .map(([videoId]) => videoId);

    // Get all expressions from these videos
    const recentExpressions = this.data.expressions
      .filter((record) => recentVideoIds.includes(record.videoId))
      .map((record) => record.expression);

    // Return unique expressions
    return [...new Set(recentExpressions)];
  }

  /**
   * Check if expression is blacklisted
   */
  async isBlacklisted(expression: string): Promise<boolean> {
    await this.ensureLoaded();

    const normalizedExpression = expression.toLowerCase().trim();
    return this.data.blacklist.some((item) => item.toLowerCase().trim() === normalizedExpression);
  }

  /**
   * Add expression to blacklist
   */
  async addToBlacklist(expression: string): Promise<void> {
    await this.ensureLoaded();

    const normalizedExpression = expression.trim();

    if (!this.data.blacklist.includes(normalizedExpression)) {
      this.data.blacklist.push(normalizedExpression);
      await this.save();
    }
  }

  /**
   * Remove expression from blacklist
   */
  async removeFromBlacklist(expression: string): Promise<void> {
    await this.ensureLoaded();

    const normalizedExpression = expression.toLowerCase().trim();
    this.data.blacklist = this.data.blacklist.filter(
      (item) => item.toLowerCase().trim() !== normalizedExpression
    );
    await this.save();
  }

  /**
   * Get all blacklisted expressions
   */
  async getBlacklist(): Promise<string[]> {
    await this.ensureLoaded();
    return [...this.data.blacklist];
  }

  /**
   * Get expressions by difficulty level
   */
  async getExpressionsByDifficulty(difficulty: Difficulty): Promise<ExpressionRecord[]> {
    await this.ensureLoaded();
    return this.data.expressions.filter((record) => record.difficulty === difficulty);
  }

  /**
   * Get expressions by category
   */
  async getExpressionsByCategory(category: ComparisonCategory): Promise<ExpressionRecord[]> {
    await this.ensureLoaded();
    return this.data.expressions.filter((record) => record.category === category);
  }

  /**
   * Check if expression was used recently (in last N videos)
   */
  async wasUsedRecently(expression: string, videoCount: number = 10): Promise<boolean> {
    const recentExpressions = await this.getRecentExpressions(videoCount);
    const normalizedExpression = expression.toLowerCase().trim();

    return recentExpressions.some((recent) => recent.toLowerCase().trim() === normalizedExpression);
  }

  /**
   * Get total expression count
   */
  async getTotalCount(): Promise<number> {
    await this.ensureLoaded();
    return this.data.expressions.length;
  }

  /**
   * Get unique expression count
   */
  async getUniqueCount(): Promise<number> {
    await this.ensureLoaded();
    const uniqueExpressions = new Set(
      this.data.expressions.map((r) => r.expression.toLowerCase().trim())
    );
    return uniqueExpressions.size;
  }

  /**
   * Clear all data (for testing)
   */
  async clear(): Promise<void> {
    this.data = {
      expressions: [],
      blacklist: [],
      lastUpdated: new Date().toISOString(),
    };
    await this.save();
  }

  /**
   * Get database path (for testing)
   */
  getDbPath(): string {
    return this.dbPath;
  }
}

/**
 * Create expression database instance
 */
export function createExpressionDatabase(
  outputDir: string = 'output',
  channelId: string
): ExpressionDatabase {
  return new ExpressionDatabase(outputDir, channelId);
}
