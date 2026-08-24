-- DropIndex
DROP INDEX "RefreshToken_userId_idx";

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revoked_idx" ON "RefreshToken"("userId", "revoked");
