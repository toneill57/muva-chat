-- Count total FK indexes created
SELECT COUNT(*) as total_fk_indexes
FROM pg_stat_user_indexes
WHERE schemaname IN ('public', 'hotels')
  AND indexname LIKE 'idx_%_fk';
