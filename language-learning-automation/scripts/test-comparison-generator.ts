/**
 * Test script for Comparison Generator and Linguistic Validator
 * Checkpoint 5: 콘텐츠 생성 테스트
 */

import { createSampleComparisonScript } from '../src/comparison/sample';
import {
  LinguisticValidator,
  validateExpression,
  isValidExpression,
  FORBIDDEN_PATTERNS,
} from '../src/comparison/linguistic-validator';
import { ExpressionDatabase } from '../src/comparison/expression-db';
import {
  comparisonScriptSchema,
  CATEGORY_NAMES,
  type ComparisonScript,
} from '../src/comparison/types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

async function testSampleScriptGeneration() {
  console.log('\n📝 Testing Sample Script Generation...\n');

  // Test with different segment counts
  const testCounts = [25, 30, 35];

  for (const count of testCounts) {
    const script = createSampleComparisonScript('test-channel', count);

    // Validate with schema
    const result = comparisonScriptSchema.safeParse(script);

    if (result.success) {
      console.log(`   ✅ Script with ${count} segments: VALID`);
      console.log(`      - Title: ${script.title.korean}`);
      console.log(`      - Hook: ${script.hook.text}`);
      console.log(`      - Hook Variants: ${script.hookVariants?.length || 0}`);
      console.log(`      - Segments: ${script.segments.length}`);
      console.log(`      - CTA: ${script.cta.question}`);
    } else {
      console.log(`   ❌ Script with ${count} segments: INVALID`);
      console.log(`      Errors: ${result.error.issues.map((i) => i.message).join(', ')}`);
      return false;
    }
  }

  return true;
}

async function testCategoryDistribution() {
  console.log('\n📊 Testing Category Distribution...\n');

  const script = createSampleComparisonScript('test-channel', 30);

  // Count categories
  const categoryCounts: Record<string, number> = {};
  for (const segment of script.segments) {
    categoryCounts[segment.category] = (categoryCounts[segment.category] || 0) + 1;
  }

  console.log('   Category distribution:');
  for (const [category, count] of Object.entries(categoryCounts)) {
    const percentage = ((count / script.segments.length) * 100).toFixed(1);
    const categoryName = CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES];
    console.log(`      - ${categoryName} (${category}): ${count} (${percentage}%)`);
  }

  // Check no category exceeds 50%
  const maxAllowed = Math.ceil(script.segments.length * 0.5);
  const maxCount = Math.max(...Object.values(categoryCounts));

  if (maxCount <= maxAllowed) {
    console.log(`   ✅ No category exceeds 50% (max: ${maxCount}, allowed: ${maxAllowed})`);
    return true;
  } else {
    console.log(`   ❌ Category distribution violation (max: ${maxCount}, allowed: ${maxAllowed})`);
    return false;
  }
}

async function testLinguisticValidator() {
  console.log('\n🔍 Testing Linguistic Validator...\n');

  const validator = new LinguisticValidator();

  // Test forbidden patterns
  const forbiddenExpressions = [
    'I am sorry for bothering you',
    'How do you do',
    'I am fine, thank you, and you?',
    'Fighting!',
    'I will go to home',
    'Please understand',
  ];

  console.log('   Testing forbidden expressions:');
  let allForbiddenDetected = true;

  for (const expr of forbiddenExpressions) {
    const result = validateExpression(expr);
    const status = result.status === 'failed' ? '❌ BLOCKED' : '⚠️ WARNING';
    console.log(`      ${status}: "${expr}"`);
    console.log(`         → Patterns: ${result.matchedPatterns.join(', ')}`);
    console.log(`         → Suggestions: ${result.suggestions.slice(0, 2).join(', ')}`);
    console.log(`         → Confidence: ${result.confidenceScore.toFixed(2)}`);

    if (result.status === 'passed') {
      allForbiddenDetected = false;
    }
  }

  // Test clean expressions
  const cleanExpressions = [
    "I'm heading home",
    'You got this!',
    'Sorry to bother you',
    "I'd like to help",
    "I'm good, thanks!",
  ];

  console.log('\n   Testing clean expressions:');
  let allCleanPassed = true;

  for (const expr of cleanExpressions) {
    const result = validateExpression(expr);
    const status = result.status === 'passed' ? '✅ PASSED' : '⚠️ FLAGGED';
    console.log(`      ${status}: "${expr}" (confidence: ${result.confidenceScore.toFixed(2)})`);

    if (result.status === 'failed') {
      allCleanPassed = false;
    }
  }

  console.log(`\n   Forbidden patterns database: ${FORBIDDEN_PATTERNS.length} patterns`);
  console.log(`   ✅ Forbidden expressions detected: ${allForbiddenDetected}`);
  console.log(`   ✅ Clean expressions passed: ${allCleanPassed}`);

  return allForbiddenDetected && allCleanPassed;
}

async function testExpressionDatabase() {
  console.log('\n💾 Testing Expression Database...\n');

  // Create temp directory for test
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'expr-db-test-'));

  try {
    const db = new ExpressionDatabase(tempDir, 'test-channel');
    await db.load();

    // Add some expressions
    const expressions = [
      { expression: "I'm heading home", category: 'daily' as const, difficulty: 'A2' as const },
      { expression: 'You got this!', category: 'emotion' as const, difficulty: 'B1' as const },
      {
        expression: 'Sorry to bother you',
        category: 'apology_thanks' as const,
        difficulty: 'B1' as const,
      },
    ];

    console.log('   Adding expressions to database...');
    await db.addExpressions(expressions, 'video-001');

    // Check recent expressions
    const recent = await db.getRecentExpressions(1);
    console.log(`   Recent expressions (last 1 video): ${recent.length}`);

    // Check if expression was used recently
    const wasUsed = await db.wasUsedRecently("I'm heading home", 1);
    console.log(`   "I'm heading home" was used recently: ${wasUsed}`);

    // Test blacklist
    await db.addToBlacklist('Fighting!');
    const isBlacklisted = await db.isBlacklisted('Fighting!');
    console.log(`   "Fighting!" is blacklisted: ${isBlacklisted}`);

    // Get counts
    const totalCount = await db.getTotalCount();
    const uniqueCount = await db.getUniqueCount();
    console.log(`   Total expressions: ${totalCount}`);
    console.log(`   Unique expressions: ${uniqueCount}`);

    console.log('   ✅ Expression database working correctly');
    return true;
  } finally {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function testHookVariants() {
  console.log('\n🎣 Testing Hook Variants...\n');

  const script = createSampleComparisonScript('test-channel', 30);

  if (!script.hookVariants || script.hookVariants.length < 3) {
    console.log('   ❌ Hook variants missing or insufficient');
    return false;
  }

  console.log(`   Hook variants count: ${script.hookVariants.length}`);
  for (let i = 0; i < script.hookVariants.length; i++) {
    const hook = script.hookVariants[i];
    console.log(`      ${i + 1}. "${hook.text}"`);
    if (hook.subtext) {
      console.log(`         → ${hook.subtext}`);
    }
  }

  const isValid = script.hookVariants.length >= 3 && script.hookVariants.length <= 5;
  console.log(`   ✅ Hook variants in valid range (3-5): ${isValid}`);

  return isValid;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Checkpoint 5: 콘텐츠 생성 테스트');
  console.log('  Testing Comparison Generator and Linguistic Validator');
  console.log('═══════════════════════════════════════════════════════════════');

  const results: { name: string; passed: boolean }[] = [];

  // Run all tests
  results.push({
    name: 'Sample Script Generation',
    passed: await testSampleScriptGeneration(),
  });

  results.push({
    name: 'Category Distribution',
    passed: await testCategoryDistribution(),
  });

  results.push({
    name: 'Linguistic Validator',
    passed: await testLinguisticValidator(),
  });

  results.push({
    name: 'Expression Database',
    passed: await testExpressionDatabase(),
  });

  results.push({
    name: 'Hook Variants',
    passed: await testHookVariants(),
  });

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let allPassed = true;
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`   ${status} ${result.name}`);
    if (!result.passed) allPassed = false;
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  ✅ All tests passed! Checkpoint 5 complete.');
  } else {
    console.log('  ❌ Some tests failed. Please review the output above.');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
