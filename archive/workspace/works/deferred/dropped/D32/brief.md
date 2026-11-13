# Deferred: D32 Member auth guard bounces to /login with no return address

## Context

## Why Deferred

requireSession() and its 401 branch redirect bare, so signing out on /documents and back in lands on /dashboard. D18 was recorded closed on both halves; P28.S9's F3 and the review found the member half is not. Not a one-liner -- needs headers()/middleware to build the next= param.

## Trigger to Promote

The next auth/session phase, or the first operator complaint

## Notes

