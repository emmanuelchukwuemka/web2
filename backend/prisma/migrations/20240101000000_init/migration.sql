-- CreateTable
CREATE TABLE "Token" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "bondingCurve" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "graduated" BOOLEAN NOT NULL DEFAULT false,
    "graduatedAt" TIMESTAMP(3),
    "croReserves" TEXT NOT NULL DEFAULT '0',
    "tokenReserves" TEXT NOT NULL DEFAULT '0',
    "realCroRaised" TEXT NOT NULL DEFAULT '0',
    "currentPrice" TEXT NOT NULL DEFAULT '0',
    "image" TEXT,
    "description" TEXT,
    "website" TEXT,
    "twitter" TEXT,
    "telegram" TEXT,
    "discord" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" SERIAL NOT NULL,
    "tokenAddr" TEXT NOT NULL,
    "curveAddr" TEXT NOT NULL,
    "trader" TEXT NOT NULL,
    "isBuy" BOOLEAN NOT NULL,
    "tokenAmount" TEXT NOT NULL,
    "croAmount" TEXT NOT NULL,
    "fee" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenHolder" (
    "id" SERIAL NOT NULL,
    "tokenAddr" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "balance" TEXT NOT NULL DEFAULT '0',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenHolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "tokenAddr" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFTCollection" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "maxSupply" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NFTCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakingEvent" (
    "id" SERIAL NOT NULL,
    "user" TEXT,
    "from" TEXT,
    "eventType" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StakingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedWallet" (
    "address" TEXT NOT NULL,
    "reason" TEXT,
    "blockedBy" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedWallet_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "IndexerState" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "IndexerState_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_address_key" ON "Token"("address");
CREATE UNIQUE INDEX "Token_bondingCurve_key" ON "Token"("bondingCurve");
CREATE INDEX "Token_creator_idx" ON "Token"("creator");
CREATE INDEX "Token_graduated_idx" ON "Token"("graduated");
CREATE INDEX "Token_createdAt_idx" ON "Token"("createdAt");
CREATE INDEX "Token_featured_idx" ON "Token"("featured");
CREATE INDEX "Token_hidden_idx" ON "Token"("hidden");

CREATE INDEX "Trade_tokenAddr_idx" ON "Trade"("tokenAddr");
CREATE INDEX "Trade_curveAddr_idx" ON "Trade"("curveAddr");
CREATE INDEX "Trade_trader_idx" ON "Trade"("trader");
CREATE INDEX "Trade_timestamp_idx" ON "Trade"("timestamp");

CREATE UNIQUE INDEX "TokenHolder_tokenAddr_holder_key" ON "TokenHolder"("tokenAddr", "holder");
CREATE INDEX "TokenHolder_tokenAddr_idx" ON "TokenHolder"("tokenAddr");
CREATE INDEX "TokenHolder_holder_idx" ON "TokenHolder"("holder");

CREATE INDEX "Comment_tokenAddr_idx" ON "Comment"("tokenAddr");
CREATE INDEX "Comment_author_idx" ON "Comment"("author");
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

CREATE UNIQUE INDEX "NFTCollection_address_key" ON "NFTCollection"("address");
CREATE INDEX "NFTCollection_creator_idx" ON "NFTCollection"("creator");
CREATE INDEX "NFTCollection_createdAt_idx" ON "NFTCollection"("createdAt");

CREATE INDEX "StakingEvent_user_idx" ON "StakingEvent"("user");
CREATE INDEX "StakingEvent_eventType_idx" ON "StakingEvent"("eventType");
CREATE INDEX "StakingEvent_timestamp_idx" ON "StakingEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_tokenAddr_fkey" FOREIGN KEY ("tokenAddr") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TokenHolder" ADD CONSTRAINT "TokenHolder_tokenAddr_fkey" FOREIGN KEY ("tokenAddr") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_tokenAddr_fkey" FOREIGN KEY ("tokenAddr") REFERENCES "Token"("address") ON DELETE RESTRICT ON UPDATE CASCADE;