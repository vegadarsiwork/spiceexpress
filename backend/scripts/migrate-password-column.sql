-- Migration: Widen PASSWORD column for bcrypt hash storage
-- bcrypt hashes are ~60 characters; current column is NVARCHAR(20)
-- Run this against CMSDB_21052026 before deploying the password hashing update
--
-- IMPORTANT: Back up the database before running this migration.

-- Step 1: Widen PASSWORD column to hold bcrypt hashes
ALTER TABLE dbo.USER_MANAGEMENT
  ALTER COLUMN PASSWORD NVARCHAR(255) NULL;
GO

-- Step 2: Verify the change
SELECT
  COLUMN_NAME,
  DATA_TYPE,
  CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME = 'USER_MANAGEMENT'
  AND COLUMN_NAME = 'PASSWORD';
GO

-- Step 3 (Optional): Hash existing plaintext passwords
-- Existing plaintext passwords will still work via the fallback comparison
-- in verifyPassword(), but should be migrated to bcrypt for security.
-- This must be done application-side since SQL Server has no native bcrypt.
-- Run the companion Node.js script: migrate-hash-passwords.mjs
