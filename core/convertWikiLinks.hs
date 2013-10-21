import Text.Pandoc

main = toJsonFilter convertWikiLinks

convertWikiLinks :: Inline -> Inline
convertWikiLinks (Link xs _) = Emph xs
convertWikiLinks x = x

-- pandoc -t json | runghc convertWikiLinks.hs | pandoc -f json
-- or
-- ghc --make convertWikiLinks.hs
-- 