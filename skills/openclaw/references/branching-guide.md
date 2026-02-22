# Branching Guide

## When to BRANCH

Branch when exploring something uncertain — you might want to abandon it.

```bash
actx branch try-qdrant "evaluate Qdrant vs Pinecone for vector search"
```

**Good branch reasons:**
- Trying a risky refactor
- Evaluating alternative libraries/approaches
- Prototyping before committing to a direction

## Merging

**Always merge — even failed branches. The lesson is the value.**

```bash
# If it worked
actx merge try-qdrant "Qdrant wins: self-hosted, better filtering, lower cost"

# If it failed — merge the LESSON, not the code
actx merge try-qdrant "Qdrant filtering too slow for our use case, staying with Pinecone"
```

## Listing & Comparing

```bash
actx branches                    # List all branches
actx diff try-qdrant             # Summary comparison with main
actx diff try-qdrant --verbose   # Show actual line changes
```

## Switching

```bash
actx switch try-qdrant           # Switch active branch
actx switch main                 # Back to main
```
