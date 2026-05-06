-- CreateTable: implicit many-to-many between Project and User for per-user favorites
CREATE TABLE "_ProjectFavorites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectFavorites_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateIndex
CREATE INDEX "_ProjectFavorites_B_index" ON "_ProjectFavorites"("B");

-- AddForeignKey
ALTER TABLE "_ProjectFavorites" ADD CONSTRAINT "_ProjectFavorites_A_fkey" FOREIGN KEY ("A") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectFavorites" ADD CONSTRAINT "_ProjectFavorites_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
